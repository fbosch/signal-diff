import { readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import {
  assertBenchmarkResultsV1,
  assertBenchmarkSchemaCompatibility,
  type BenchmarkResultsV1,
} from "./contracts.ts"
import {
  analyzeBenchmarkDrift,
  DEFAULT_DRIFT_THRESHOLDS,
  type DriftSummary,
  type DriftThresholds,
  renderDriftMarkdown,
} from "./drift.ts"

function controlsSignature(result: BenchmarkResultsV1): string {
  return `${result.controls.warmup}/${result.controls.samples}/${result.controls.iterations}`
}

function runtimeSignature(result: BenchmarkResultsV1): string {
  return `${result.runtime.node_version} ${result.runtime.platform}/${result.runtime.arch}`
}

export function assertComparableBenchmarkRuns(
  baseline: BenchmarkResultsV1,
  current: BenchmarkResultsV1,
): void {
  const baselineControls = controlsSignature(baseline)
  const currentControls = controlsSignature(current)

  if (baselineControls !== currentControls) {
    throw new Error(
      `Benchmark controls mismatch: baseline=${baselineControls}, current=${currentControls}. Re-run benchmark with matching --warmup/--samples/--iterations controls before drift comparison.`,
    )
  }

  const baselineRuntime = runtimeSignature(baseline)
  const currentRuntime = runtimeSignature(current)

  if (baselineRuntime !== currentRuntime) {
    process.stderr.write(
      `Benchmark runtime mismatch: baseline=${baselineRuntime}, current=${currentRuntime}. Drift comparison can be noisy across runtimes.\n`,
    )
  }
}

interface CompareControls {
  baselinePath: string
  currentPath: string
  summaryPath: string
  outputPath: string
  thresholds: DriftThresholds
}

function parseThresholdValue(rawValue: string, flagName: string): number {
  const value = Number(rawValue)

  if (Number.isFinite(value) === false || value < 0) {
    throw new Error(
      `${flagName} must be a number greater than or equal to 0. Received '${rawValue}'.`,
    )
  }

  return value
}

function resolveDriftThresholds(
  warnPercent: number,
  failPercent: number,
): DriftThresholds {
  if (failPercent < warnPercent) {
    throw new Error(
      `--fail-threshold must be greater than or equal to --warn-threshold. Received warn=${warnPercent}, fail=${failPercent}.`,
    )
  }

  return {
    warn_percent: warnPercent,
    fail_percent: failPercent,
  }
}

export function parseDriftThresholdsFromArgs(argv: string[]): DriftThresholds {
  let warnPercent = DEFAULT_DRIFT_THRESHOLDS.warn_percent
  let failPercent = DEFAULT_DRIFT_THRESHOLDS.fail_percent

  for (const argument of argv) {
    if (argument.startsWith("--warn-threshold=")) {
      warnPercent = parseThresholdValue(
        argument.slice("--warn-threshold=".length),
        "--warn-threshold",
      )
      continue
    }

    if (argument.startsWith("--fail-threshold=")) {
      failPercent = parseThresholdValue(
        argument.slice("--fail-threshold=".length),
        "--fail-threshold",
      )
    }
  }

  return resolveDriftThresholds(warnPercent, failPercent)
}

function parseControls(argv: string[]): CompareControls {
  let baselinePath = ""
  let currentPath = ""
  let summaryPath = ""
  let outputPath = ""
  let warnPercent = DEFAULT_DRIFT_THRESHOLDS.warn_percent
  let failPercent = DEFAULT_DRIFT_THRESHOLDS.fail_percent

  for (const argument of argv) {
    if (argument.startsWith("--baseline=")) {
      baselinePath = argument.slice("--baseline=".length)
      continue
    }

    if (argument.startsWith("--current=")) {
      currentPath = argument.slice("--current=".length)
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

    if (argument.startsWith("--warn-threshold=")) {
      warnPercent = parseThresholdValue(
        argument.slice("--warn-threshold=".length),
        "--warn-threshold",
      )
      continue
    }

    if (argument.startsWith("--fail-threshold=")) {
      failPercent = parseThresholdValue(
        argument.slice("--fail-threshold=".length),
        "--fail-threshold",
      )
      continue
    }

    throw new Error(`Unknown argument '${argument}'.`)
  }

  if (baselinePath === "") {
    throw new Error("Missing required argument '--baseline=<path>'.")
  }

  if (currentPath === "") {
    throw new Error("Missing required argument '--current=<path>'.")
  }

  if (summaryPath === "") {
    throw new Error("Missing required argument '--summary=<path>'.")
  }

  if (outputPath === "") {
    throw new Error("Missing required argument '--output=<path>'.")
  }

  return {
    baselinePath,
    currentPath,
    summaryPath,
    outputPath,
    thresholds: resolveDriftThresholds(warnPercent, failPercent),
  }
}

function readBenchmarkResults(filePath: string): BenchmarkResultsV1 {
  const rawValue = readFileSync(filePath, "utf8")
  let parsed: unknown

  try {
    parsed = JSON.parse(rawValue) as unknown
  } catch {
    const jsonStart = rawValue.indexOf("{")

    if (jsonStart < 0) {
      throw new Error(
        `Unable to parse JSON benchmark results from '${filePath}'.`,
      )
    }

    parsed = JSON.parse(rawValue.slice(jsonStart)) as unknown
  }

  assertBenchmarkSchemaCompatibility(parsed)
  assertBenchmarkResultsV1(parsed)
  return parsed
}

function hasFailure(summary: DriftSummary): boolean {
  return summary.overall_status === "fail"
}

export function runCompareCli(): void {
  const controls = parseControls(process.argv.slice(2))
  const baseline = readBenchmarkResults(controls.baselinePath)
  const current = readBenchmarkResults(controls.currentPath)
  assertComparableBenchmarkRuns(baseline, current)
  const summary = analyzeBenchmarkDrift(baseline, current, controls.thresholds)
  const markdown = renderDriftMarkdown(summary)

  writeFileSync(controls.summaryPath, markdown)
  writeFileSync(controls.outputPath, `${JSON.stringify(summary, null, 2)}\n`)
  process.stdout.write(markdown)

  if (hasFailure(summary)) {
    process.exitCode = 1
  }
}

const executedAsScript =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (executedAsScript) {
  runCompareCli()
}
