import { performance } from "node:perf_hooks"

import { benchmarkScenarios } from "./scenarios.ts"

interface BenchmarkControls {
  warmup: number
  samples: number
  iterations: number
  json: boolean
  scenarioIds: Set<string>
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

    throw new Error(`Unknown argument '${argument}'.`)
  }

  return {
    warmup,
    samples,
    iterations,
    json,
    scenarioIds,
  }
}

function percentile(samples: number[], fraction: number): number {
  if (samples.length === 0) {
    return 0
  }

  const index = Math.min(
    samples.length - 1,
    Math.max(0, Math.ceil(samples.length * fraction) - 1),
  )

  return samples[index] ?? 0
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

function main(): void {
  const controls = parseControls(process.argv.slice(2))
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

  if (controls.json) {
    process.stdout.write(
      `${JSON.stringify({ scenarios: summaries }, null, 2)}\n`,
    )
    return
  }

  process.stdout.write(`${formatHumanOutput(summaries)}\n`)
}

main()
