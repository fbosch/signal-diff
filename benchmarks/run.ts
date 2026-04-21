import { execFileSync } from "node:child_process"
import { performance } from "node:perf_hooks"

import { resolveBaselinePath, writeBaselineResult } from "./baseline.ts"
import {
  BENCHMARK_RESULT_SCHEMA_VERSION,
  type BenchmarkResultsV1,
  type BenchmarkRunControls,
  createBenchmarkRuntimeMetadata,
} from "./contracts.ts"
import { benchmarkScenarios } from "./scenarios.ts"

interface BenchmarkControls {
  warmup: number
  samples: number
  iterations: number
  json: boolean
  scenarioIds: Set<string>
  baselinePath: string
  updateBaseline: boolean
}

interface ScenarioSummary {
  id: string
  description: string
  warmup: number
  samples: number
  iterations: number
  checksum: number
  minMs: number
  p50Ms: number
  p95Ms: number
  maxMs: number
  meanMs: number
}

const DEFAULT_WARMUP = 2
const DEFAULT_SAMPLES = 12
const DEFAULT_ITERATIONS = 30

function parsePositiveInteger(raw: string, flagName: string): number {
  const value = Number(raw)

  if (Number.isInteger(value) === false || value <= 0) {
    throw new Error(
      `${flagName} must be a positive integer. Received '${raw}'.`,
    )
  }

  return value
}

function parseControls(argv: string[]): BenchmarkControls {
  let warmup = DEFAULT_WARMUP
  let samples = DEFAULT_SAMPLES
  let iterations = DEFAULT_ITERATIONS
  let json = false
  const scenarioIds = new Set<string>()
  let baselinePath = ""
  let updateBaseline = false

  for (const argument of argv) {
    if (argument === "--json") {
      json = true
      continue
    }

    if (argument.startsWith("--warmup=")) {
      warmup = parsePositiveInteger(
        argument.slice("--warmup=".length),
        "--warmup",
      )
      continue
    }

    if (argument.startsWith("--samples=")) {
      samples = parsePositiveInteger(
        argument.slice("--samples=".length),
        "--samples",
      )
      continue
    }

    if (argument.startsWith("--iterations=")) {
      iterations = parsePositiveInteger(
        argument.slice("--iterations=".length),
        "--iterations",
      )
      continue
    }

    if (argument.startsWith("--scenario=")) {
      const rawIds = argument.slice("--scenario=".length)
      const values = rawIds
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value !== "")

      for (const value of values) {
        scenarioIds.add(value)
      }
      continue
    }

    if (argument.startsWith("--baseline=")) {
      baselinePath = argument.slice("--baseline=".length)
      continue
    }

    if (argument === "--update-baseline") {
      updateBaseline = true
      continue
    }

    throw new Error(`Unknown argument '${argument}'.`)
  }

  return {
    warmup,
    samples,
    iterations,
    json,
    scenarioIds,
    baselinePath: resolveBaselinePath(baselinePath),
    updateBaseline,
  }
}

function percentile(samples: number[], fraction: number): number {
  if (samples.length === 0) {
    return 0
  }

  if (samples.length === 1) {
    return samples[0] ?? 0
  }

  const boundedFraction = Math.min(1, Math.max(0, fraction))
  const position = (samples.length - 1) * boundedFraction
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  const lowerValue = samples[lowerIndex] ?? 0
  const upperValue = samples[upperIndex] ?? lowerValue

  if (lowerIndex === upperIndex) {
    return lowerValue
  }

  const weight = position - lowerIndex

  return lowerValue + (upperValue - lowerValue) * weight
}

function summarizeScenario(
  id: string,
  description: string,
  samples: number[],
  checksum: number,
  controls: BenchmarkControls,
): ScenarioSummary {
  const sortedSamples = [...samples].sort((left, right) => left - right)
  const minMs = sortedSamples[0] ?? 0
  const maxMs = sortedSamples[sortedSamples.length - 1] ?? 0
  const meanMs =
    sortedSamples.reduce((total, sample) => total + sample, 0) /
    Math.max(sortedSamples.length, 1)

  return {
    id,
    description,
    warmup: controls.warmup,
    samples: controls.samples,
    iterations: controls.iterations,
    checksum,
    minMs,
    p50Ms: percentile(sortedSamples, 0.5),
    p95Ms: percentile(sortedSamples, 0.95),
    maxMs,
    meanMs,
  }
}

function runScenario(
  scenarioId: string,
  scenarioDescription: string,
  scenarioRun: () => number,
  controls: BenchmarkControls,
): ScenarioSummary {
  let checksum = 0

  for (let index = 0; index < controls.warmup; index += 1) {
    for (let iteration = 0; iteration < controls.iterations; iteration += 1) {
      checksum += scenarioRun()
    }
  }

  const sampleDurationsMs: number[] = []

  for (let sampleIndex = 0; sampleIndex < controls.samples; sampleIndex += 1) {
    const start = performance.now()

    for (let iteration = 0; iteration < controls.iterations; iteration += 1) {
      checksum += scenarioRun()
    }

    const elapsedMs = performance.now() - start
    sampleDurationsMs.push(elapsedMs / controls.iterations)
  }

  return summarizeScenario(
    scenarioId,
    scenarioDescription,
    sampleDurationsMs,
    checksum,
    controls,
  )
}

function formatHumanOutput(summaries: ScenarioSummary[]): string {
  const lines = [
    "signal-diff benchmark harness",
    "",
    "scenario | mean(ms) | p50(ms) | p95(ms) | min(ms) | max(ms)",
    "--- | ---: | ---: | ---: | ---: | ---:",
  ]

  for (const summary of summaries) {
    lines.push(
      `${summary.id} | ${summary.meanMs.toFixed(4)} | ${summary.p50Ms.toFixed(4)} | ${summary.p95Ms.toFixed(4)} | ${summary.minMs.toFixed(4)} | ${summary.maxMs.toFixed(4)}`,
    )
  }

  return lines.join("\n")
}

function toBenchmarkRunControls(
  controls: BenchmarkControls,
): BenchmarkRunControls {
  return {
    warmup: controls.warmup,
    samples: controls.samples,
    iterations: controls.iterations,
  }
}

function toBenchmarkResults(
  controls: BenchmarkControls,
  summaries: ScenarioSummary[],
): BenchmarkResultsV1 {
  const gitCommit = resolveGitCommit()

  return {
    schema_version: BENCHMARK_RESULT_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    git_commit: gitCommit,
    runtime: createBenchmarkRuntimeMetadata(),
    controls: toBenchmarkRunControls(controls),
    scenarios: summaries.map((summary) => ({
      id: summary.id,
      description: summary.description,
      warmup: summary.warmup,
      samples: summary.samples,
      iterations: summary.iterations,
      checksum: summary.checksum,
      min_ms: summary.minMs,
      p50_ms: summary.p50Ms,
      p95_ms: summary.p95Ms,
      max_ms: summary.maxMs,
      mean_ms: summary.meanMs,
    })),
  }
}

function resolveGitCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim()
  } catch {
    return "unknown"
  }
}

function main(): void {
  const controls = parseControls(process.argv.slice(2))

  const knownScenarioIds = new Set(
    benchmarkScenarios.map((scenario) => scenario.id),
  )

  if (controls.scenarioIds.size > 0) {
    const unknownScenarioIds = [...controls.scenarioIds].filter(
      (scenarioId) => knownScenarioIds.has(scenarioId) === false,
    )

    if (unknownScenarioIds.length > 0) {
      throw new Error(
        `Unknown scenario id(s): ${unknownScenarioIds.join(", ")}. Available: ${[...knownScenarioIds].join(", ")}.`,
      )
    }
  }

  const selectedScenarios = benchmarkScenarios.filter((scenario) => {
    if (controls.scenarioIds.size === 0) {
      return true
    }

    return controls.scenarioIds.has(scenario.id)
  })

  if (selectedScenarios.length === 0) {
    throw new Error(
      "No scenarios selected. Use --scenario=<id> to pick valid scenarios.",
    )
  }

  const summaries = selectedScenarios.map((scenario) =>
    runScenario(scenario.id, scenario.description, scenario.run, controls),
  )
  const benchmarkResults = toBenchmarkResults(controls, summaries)

  if (controls.updateBaseline) {
    writeBaselineResult(controls.baselinePath, benchmarkResults)
  }

  if (controls.json) {
    process.stdout.write(`${JSON.stringify(benchmarkResults, null, 2)}\n`)
    return
  }

  const baselineLine = controls.updateBaseline
    ? `\n\nBaseline updated: ${controls.baselinePath}`
    : ""
  process.stdout.write(`${formatHumanOutput(summaries)}${baselineLine}\n`)
}

main()
