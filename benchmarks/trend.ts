import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

import {
  assertBenchmarkResultsV1,
  assertBenchmarkSchemaCompatibility,
  BENCHMARK_RESULT_SCHEMA_VERSION,
  type BenchmarkResultsV1,
  type BenchmarkRunControls,
  type BenchmarkRuntimeMetadata,
} from "./contracts.ts"

const DEFAULT_TREND_WINDOW = 5
const TOP_SCENARIOS_LIMIT = 3

type TrendSource = "current" | "history"

export interface BenchmarkTrendRun {
  generated_at: string
  git_commit: string
  runtime: BenchmarkRuntimeMetadata
  controls: BenchmarkRunControls
  source: TrendSource
}

export interface ScenarioTrendSummary {
  id: string
  description: string
  effective_sample_size: number
  first_mean_ms: number
  last_mean_ms: number
  mean_delta_percent: number
  first_p95_ms: number
  last_p95_ms: number
  p95_delta_percent: number
}

export interface BenchmarkTrendSummary {
  schema_version: typeof BENCHMARK_RESULT_SCHEMA_VERSION
  generated_at: string
  window_size: number
  included_runs: number
  missing_runs: number
  effective_sample_size: number
  runtime_signatures: string[]
  controls_signatures: string[]
  runs: BenchmarkTrendRun[]
  scenarios: ScenarioTrendSummary[]
  top_regressions: ScenarioTrendSummary[]
  top_improvements: ScenarioTrendSummary[]
}

interface TrendControls {
  currentPath: string
  historyDir: string
  summaryPath: string
  outputPath: string
  windowSize: number
}

interface ScenarioPoint {
  generated_at: string
  mean_ms: number
  p95_ms: number
  description: string
}

function parsePositiveInteger(raw: string, flagName: string): number {
  const parsed = Number(raw)

  if (Number.isInteger(parsed) === false || parsed <= 0) {
    throw new Error(
      `${flagName} must be a positive integer. Received '${raw}'.`,
    )
  }

  return parsed
}

function parseControls(argv: string[]): TrendControls {
  let currentPath = ""
  let historyDir = ""
  let summaryPath = ""
  let outputPath = ""
  let windowSize = DEFAULT_TREND_WINDOW

  for (const argument of argv) {
    if (argument.startsWith("--current=")) {
      currentPath = argument.slice("--current=".length)
      continue
    }

    if (argument.startsWith("--history-dir=")) {
      historyDir = argument.slice("--history-dir=".length)
      continue
    }

    if (argument.startsWith("--summary=")) {
      summaryPath = argument.slice("--summary=".length)
      continue
    }

    if (argument.startsWith("--output=")) {
      outputPath = argument.slice("--output=".length)
      continue
    }

    if (argument.startsWith("--window=")) {
      windowSize = parsePositiveInteger(
        argument.slice("--window=".length),
        "--window",
      )
      continue
    }

    throw new Error(`Unknown argument '${argument}'.`)
  }

  if (currentPath === "") {
    throw new Error("Missing required argument '--current=<path>'.")
  }

  if (historyDir === "") {
    throw new Error("Missing required argument '--history-dir=<path>'.")
  }

  if (summaryPath === "") {
    throw new Error("Missing required argument '--summary=<path>'.")
  }

  if (outputPath === "") {
    throw new Error("Missing required argument '--output=<path>'.")
  }

  return {
    currentPath,
    historyDir,
    summaryPath,
    outputPath,
    windowSize,
  }
}

function readBenchmarkResults(filePath: string): BenchmarkResultsV1 {
  const rawValue = readFileSync(filePath, "utf8")
  const parsedValue = JSON.parse(rawValue) as unknown
  assertBenchmarkSchemaCompatibility(parsedValue)
  assertBenchmarkResultsV1(parsedValue)
  return parsedValue
}

function collectResultFiles(historyDir: string): string[] {
  try {
    const stats = statSync(historyDir)

    if (stats.isDirectory() === false) {
      return []
    }
  } catch {
    return []
  }

  const queue = [historyDir]
  const files: string[] = []

  while (queue.length > 0) {
    const nextDir = queue.shift()

    if (nextDir === undefined) {
      continue
    }

    for (const entry of readdirSync(nextDir, { withFileTypes: true })) {
      const entryPath = path.join(nextDir, entry.name)

      if (entry.isDirectory()) {
        queue.push(entryPath)
        continue
      }

      if (
        entry.isFile() &&
        entry.name.endsWith("benchmark-trend-results.json")
      ) {
        files.push(entryPath)
      }
    }
  }

  return files
}

function toRuntimeSignature(runtime: BenchmarkRuntimeMetadata): string {
  return `${runtime.node_version} ${runtime.platform}/${runtime.arch}`
}

function toControlsSignature(controls: BenchmarkRunControls): string {
  return `${controls.warmup}/${controls.samples}/${controls.iterations}`
}

function toPercentDelta(first: number, last: number): number {
  if (first === 0) {
    if (last === 0) {
      return 0
    }

    return Number.POSITIVE_INFINITY
  }

  return ((last - first) / first) * 100
}

function sortRunsChronologically(
  left: BenchmarkTrendRun,
  right: BenchmarkTrendRun,
): number {
  const byTime = left.generated_at.localeCompare(right.generated_at)

  if (byTime !== 0) {
    return byTime
  }

  return left.git_commit.localeCompare(right.git_commit)
}

function dedupeAndTrimRuns(
  runs: BenchmarkTrendRun[],
  windowSize: number,
): BenchmarkTrendRun[] {
  const dedupedByCommit = new Map<string, BenchmarkTrendRun>()

  for (const run of runs) {
    const key = `${run.git_commit}:${run.generated_at}`
    dedupedByCommit.set(key, run)
  }

  return [...dedupedByCommit.values()]
    .sort(sortRunsChronologically)
    .slice(-windowSize)
}

function buildScenarioTrendSummaries(
  selectedRuns: BenchmarkTrendRun[],
  resultsByCommitTime: Map<string, BenchmarkResultsV1>,
): ScenarioTrendSummary[] {
  const pointsByScenario = new Map<string, ScenarioPoint[]>()

  for (const run of selectedRuns) {
    const result = resultsByCommitTime.get(
      `${run.git_commit}:${run.generated_at}`,
    )

    if (result === undefined) {
      continue
    }

    for (const scenario of result.scenarios) {
      const existing = pointsByScenario.get(scenario.id) ?? []
      existing.push({
        generated_at: result.generated_at,
        mean_ms: scenario.mean_ms,
        p95_ms: scenario.p95_ms,
        description: scenario.description,
      })
      pointsByScenario.set(scenario.id, existing)
    }
  }

  const summaries: ScenarioTrendSummary[] = []

  for (const [scenarioId, points] of pointsByScenario) {
    const sortedPoints = [...points].sort((left, right) =>
      left.generated_at.localeCompare(right.generated_at),
    )
    const first = sortedPoints[0]
    const last = sortedPoints[sortedPoints.length - 1]

    if (first === undefined || last === undefined) {
      continue
    }

    summaries.push({
      id: scenarioId,
      description: last.description,
      effective_sample_size: sortedPoints.length,
      first_mean_ms: first.mean_ms,
      last_mean_ms: last.mean_ms,
      mean_delta_percent: toPercentDelta(first.mean_ms, last.mean_ms),
      first_p95_ms: first.p95_ms,
      last_p95_ms: last.p95_ms,
      p95_delta_percent: toPercentDelta(first.p95_ms, last.p95_ms),
    })
  }

  return summaries.sort((left, right) => left.id.localeCompare(right.id))
}

function topRegressions(
  scenarios: ScenarioTrendSummary[],
): ScenarioTrendSummary[] {
  return [...scenarios]
    .filter(
      (scenario) =>
        scenario.effective_sample_size >= 2 &&
        Math.max(scenario.mean_delta_percent, scenario.p95_delta_percent) > 0 &&
        Math.min(scenario.mean_delta_percent, scenario.p95_delta_percent) >= 0,
    )
    .sort(
      (left, right) =>
        Math.max(right.mean_delta_percent, right.p95_delta_percent) -
        Math.max(left.mean_delta_percent, left.p95_delta_percent),
    )
    .slice(0, TOP_SCENARIOS_LIMIT)
}

function topImprovements(
  scenarios: ScenarioTrendSummary[],
): ScenarioTrendSummary[] {
  return [...scenarios]
    .filter(
      (scenario) =>
        scenario.effective_sample_size >= 2 &&
        Math.min(scenario.mean_delta_percent, scenario.p95_delta_percent) < 0 &&
        Math.max(scenario.mean_delta_percent, scenario.p95_delta_percent) <= 0,
    )
    .sort(
      (left, right) =>
        Math.min(left.mean_delta_percent, left.p95_delta_percent) -
        Math.min(right.mean_delta_percent, right.p95_delta_percent),
    )
    .slice(0, TOP_SCENARIOS_LIMIT)
}

function formatPercent(value: number): string {
  if (Number.isFinite(value) === false) {
    return "+inf%"
  }

  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function analyzeBenchmarkTrend(
  currentResult: BenchmarkResultsV1,
  historicalResults: BenchmarkResultsV1[],
  windowSize: number = DEFAULT_TREND_WINDOW,
): BenchmarkTrendSummary {
  const allResults: Array<{ source: TrendSource; result: BenchmarkResultsV1 }> =
    [
      { source: "history", result: currentResult },
      ...historicalResults.map((result) => ({
        source: "history" as const,
        result,
      })),
    ]

  const allRuns: BenchmarkTrendRun[] = allResults.map(
    ({ source, result }, index) => ({
      generated_at: result.generated_at,
      git_commit: result.git_commit,
      runtime: result.runtime,
      controls: result.controls,
      source: index === 0 ? "current" : source,
    }),
  )

  const selectedRuns = dedupeAndTrimRuns(allRuns, windowSize)
  const resultsByCommitTime = new Map<string, BenchmarkResultsV1>()

  for (const { result } of allResults) {
    resultsByCommitTime.set(
      `${result.git_commit}:${result.generated_at}`,
      result,
    )
  }

  const scenarioSummaries = buildScenarioTrendSummaries(
    selectedRuns,
    resultsByCommitTime,
  )
  const regressions = topRegressions(scenarioSummaries)
  const improvements = topImprovements(scenarioSummaries)
  const runtimeSignatures = [
    ...new Set(selectedRuns.map((run) => toRuntimeSignature(run.runtime))),
  ].sort()
  const controlsSignatures = [
    ...new Set(selectedRuns.map((run) => toControlsSignature(run.controls))),
  ].sort()

  return {
    schema_version: BENCHMARK_RESULT_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    window_size: windowSize,
    included_runs: selectedRuns.length,
    missing_runs: Math.max(0, windowSize - selectedRuns.length),
    effective_sample_size: selectedRuns.length,
    runtime_signatures: runtimeSignatures,
    controls_signatures: controlsSignatures,
    runs: selectedRuns,
    scenarios: scenarioSummaries,
    top_regressions: regressions,
    top_improvements: improvements,
  }
}

export function renderBenchmarkTrendMarkdown(
  summary: BenchmarkTrendSummary,
): string {
  const lines = [
    "## Benchmark Trend Summary",
    "",
    `Window: ${summary.included_runs}/${summary.window_size} runs (missing ${summary.missing_runs})`,
    `Runtime coverage: ${summary.runtime_signatures.join(", ") || "unknown"}`,
    `Controls coverage: ${summary.controls_signatures.join(", ") || "unknown"}`,
    "",
    "Scenario | Samples | Mean delta | P95 delta",
    "--- | ---: | ---: | ---:",
  ]

  for (const scenario of summary.scenarios) {
    lines.push(
      `${scenario.id} | ${scenario.effective_sample_size} | ${formatPercent(scenario.mean_delta_percent)} | ${formatPercent(scenario.p95_delta_percent)}`,
    )
  }

  if (summary.top_regressions.length > 0) {
    lines.push("", "Top sustained regressions")

    for (const scenario of summary.top_regressions) {
      const worst = Math.max(
        scenario.mean_delta_percent,
        scenario.p95_delta_percent,
      )
      lines.push(
        `- ${scenario.id}: ${formatPercent(worst)} over ${scenario.effective_sample_size} runs`,
      )
    }
  }

  if (summary.top_improvements.length > 0) {
    lines.push("", "Top sustained improvements")

    for (const scenario of summary.top_improvements) {
      const best = Math.min(
        scenario.mean_delta_percent,
        scenario.p95_delta_percent,
      )
      lines.push(
        `- ${scenario.id}: ${formatPercent(best)} over ${scenario.effective_sample_size} runs`,
      )
    }
  }

  return `${lines.join("\n")}\n`
}

export function runTrendCli(): void {
  const controls = parseControls(process.argv.slice(2))
  const currentResult = readBenchmarkResults(controls.currentPath)
  const resultFiles = collectResultFiles(controls.historyDir)
  const historicalResults = resultFiles
    .map((filePath) => readBenchmarkResults(filePath))
    .filter(
      (result) =>
        result.git_commit !== currentResult.git_commit ||
        result.generated_at !== currentResult.generated_at,
    )
  const summary = analyzeBenchmarkTrend(
    currentResult,
    historicalResults,
    controls.windowSize,
  )
  const markdown = renderBenchmarkTrendMarkdown(summary)

  writeFileSync(controls.summaryPath, markdown)
  writeFileSync(controls.outputPath, `${JSON.stringify(summary, null, 2)}\n`)
  process.stdout.write(markdown)
}

const executedAsScript =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (executedAsScript) {
  runTrendCli()
}
