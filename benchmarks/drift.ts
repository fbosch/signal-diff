import type {
  BenchmarkResultsV1,
  BenchmarkScenarioSummary,
} from "./contracts.ts"

export type DriftStatus = "pass" | "warn" | "fail"

export interface DriftThresholds {
  warn_percent: number
  fail_percent: number
}

export interface ScenarioDrift {
  id: string
  description: string
  baseline_mean_ms: number
  current_mean_ms: number
  mean_delta_percent: number
  baseline_p95_ms: number
  current_p95_ms: number
  p95_delta_percent: number
  status: DriftStatus
}

export interface DriftSummary {
  overall_status: DriftStatus
  thresholds: DriftThresholds
  scenario_drifts: ScenarioDrift[]
  top_regressions: ScenarioDrift[]
  top_improvements: ScenarioDrift[]
  missing_scenarios: string[]
  added_scenarios: string[]
}

export const DEFAULT_DRIFT_THRESHOLDS: DriftThresholds = {
  warn_percent: 10,
  fail_percent: 25,
}

function toScenarioMap(
  scenarios: BenchmarkScenarioSummary[],
): Map<string, BenchmarkScenarioSummary> {
  return new Map(scenarios.map((scenario) => [scenario.id, scenario]))
}

function toPercentDelta(baselineValue: number, currentValue: number): number {
  if (baselineValue === 0) {
    if (currentValue === 0) {
      return 0
    }

    return Number.POSITIVE_INFINITY
  }

  return ((currentValue - baselineValue) / baselineValue) * 100
}

function maxStatus(left: DriftStatus, right: DriftStatus): DriftStatus {
  const rank: Record<DriftStatus, number> = {
    pass: 0,
    warn: 1,
    fail: 2,
  }

  return rank[left] >= rank[right] ? left : right
}

function resolveScenarioStatus(
  meanDeltaPercent: number,
  p95DeltaPercent: number,
  thresholds: DriftThresholds,
): DriftStatus {
  const worstRegression = Math.max(meanDeltaPercent, p95DeltaPercent)

  if (worstRegression >= thresholds.fail_percent) {
    return "fail"
  }

  if (worstRegression >= thresholds.warn_percent) {
    return "warn"
  }

  return "pass"
}

export function analyzeBenchmarkDrift(
  baseline: BenchmarkResultsV1,
  current: BenchmarkResultsV1,
  thresholds: DriftThresholds = DEFAULT_DRIFT_THRESHOLDS,
): DriftSummary {
  const baselineById = toScenarioMap(baseline.scenarios)
  const currentById = toScenarioMap(current.scenarios)

  const missingScenarios = [...baselineById.keys()].filter(
    (id) => currentById.has(id) === false,
  )
  const addedScenarios = [...currentById.keys()].filter(
    (id) => baselineById.has(id) === false,
  )

  const scenarioDrifts: ScenarioDrift[] = []
  let overallStatus: DriftStatus = "pass"

  for (const baselineScenario of baseline.scenarios) {
    const currentScenario = currentById.get(baselineScenario.id)

    if (currentScenario === undefined) {
      continue
    }

    const meanDeltaPercent = toPercentDelta(
      baselineScenario.mean_ms,
      currentScenario.mean_ms,
    )
    const p95DeltaPercent = toPercentDelta(
      baselineScenario.p95_ms,
      currentScenario.p95_ms,
    )
    const status = resolveScenarioStatus(
      meanDeltaPercent,
      p95DeltaPercent,
      thresholds,
    )

    scenarioDrifts.push({
      id: baselineScenario.id,
      description: baselineScenario.description,
      baseline_mean_ms: baselineScenario.mean_ms,
      current_mean_ms: currentScenario.mean_ms,
      mean_delta_percent: meanDeltaPercent,
      baseline_p95_ms: baselineScenario.p95_ms,
      current_p95_ms: currentScenario.p95_ms,
      p95_delta_percent: p95DeltaPercent,
      status,
    })

    overallStatus = maxStatus(overallStatus, status)
  }

  if (missingScenarios.length > 0 || addedScenarios.length > 0) {
    overallStatus = "fail"
  }

  const regressions = topRegressions(scenarioDrifts)
  const improvements = topImprovements(scenarioDrifts)

  return {
    overall_status: overallStatus,
    thresholds,
    scenario_drifts: scenarioDrifts,
    top_regressions: regressions,
    top_improvements: improvements,
    missing_scenarios: missingScenarios,
    added_scenarios: addedScenarios,
  }
}

function formatPercent(value: number): string {
  if (Number.isFinite(value) === false) {
    return "+inf%"
  }

  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

function scenarioStatusEmoji(status: DriftStatus): string {
  if (status === "fail") {
    return "FAIL"
  }

  if (status === "warn") {
    return "WARN"
  }

  return "PASS"
}

function topRegressions(scenarioDrifts: ScenarioDrift[]): ScenarioDrift[] {
  return [...scenarioDrifts]
    .filter(
      (scenario) =>
        Math.max(scenario.mean_delta_percent, scenario.p95_delta_percent) > 0 &&
        Math.min(scenario.mean_delta_percent, scenario.p95_delta_percent) >= 0,
    )
    .sort(
      (left, right) =>
        Math.max(right.mean_delta_percent, right.p95_delta_percent) -
        Math.max(left.mean_delta_percent, left.p95_delta_percent),
    )
    .slice(0, 3)
}

function topImprovements(scenarioDrifts: ScenarioDrift[]): ScenarioDrift[] {
  return [...scenarioDrifts]
    .filter(
      (scenario) =>
        Math.min(scenario.mean_delta_percent, scenario.p95_delta_percent) < 0 &&
        Math.max(scenario.mean_delta_percent, scenario.p95_delta_percent) <= 0,
    )
    .sort(
      (left, right) =>
        Math.min(left.mean_delta_percent, left.p95_delta_percent) -
        Math.min(right.mean_delta_percent, right.p95_delta_percent),
    )
    .slice(0, 3)
}

export function renderDriftMarkdown(summary: DriftSummary): string {
  const lines: string[] = [
    "## Benchmark Drift Summary",
    "",
    `Overall status: ${scenarioStatusEmoji(summary.overall_status)}`,
    `Thresholds: warn >= ${summary.thresholds.warn_percent.toFixed(2)}%, fail >= ${summary.thresholds.fail_percent.toFixed(2)}%`,
    "",
    "Scenario | Mean delta | P95 delta | Status",
    "--- | ---: | ---: | ---",
  ]

  for (const drift of summary.scenario_drifts) {
    lines.push(
      `${drift.id} | ${formatPercent(drift.mean_delta_percent)} | ${formatPercent(drift.p95_delta_percent)} | ${scenarioStatusEmoji(drift.status)}`,
    )
  }

  if (summary.top_regressions.length > 0) {
    lines.push("", "Top regressions")

    for (const regression of summary.top_regressions) {
      const worst = Math.max(
        regression.mean_delta_percent,
        regression.p95_delta_percent,
      )
      lines.push(`- ${regression.id}: ${formatPercent(worst)}`)
    }
  }

  if (summary.top_improvements.length > 0) {
    lines.push("", "Top improvements")

    for (const improvement of summary.top_improvements) {
      const best = Math.min(
        improvement.mean_delta_percent,
        improvement.p95_delta_percent,
      )
      lines.push(`- ${improvement.id}: ${formatPercent(best)}`)
    }
  }

  if (summary.missing_scenarios.length > 0) {
    lines.push(
      "",
      `Missing scenarios in current run: ${summary.missing_scenarios.join(", ")}`,
    )
  }

  if (summary.added_scenarios.length > 0) {
    lines.push(
      "",
      `New scenarios not in baseline: ${summary.added_scenarios.join(", ")}`,
    )
  }

  return `${lines.join("\n")}\n`
}
