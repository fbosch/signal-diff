import process from "node:process"

export const BENCHMARK_RESULT_SCHEMA_VERSION = "v1alpha1"

export interface BenchmarkRunControls {
  warmup: number
  samples: number
  iterations: number
}

export interface BenchmarkRuntimeMetadata {
  node_version: string
  platform: string
  arch: string
}

export interface BenchmarkScenarioSummary {
  id: string
  description: string
  warmup: number
  samples: number
  iterations: number
  checksum: number
  min_ms: number
  p50_ms: number
  p95_ms: number
  max_ms: number
  mean_ms: number
}

export interface BenchmarkResultsV1 {
  schema_version: typeof BENCHMARK_RESULT_SCHEMA_VERSION
  generated_at: string
  git_commit: string
  runtime: BenchmarkRuntimeMetadata
  controls: BenchmarkRunControls
  scenarios: BenchmarkScenarioSummary[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isBenchmarkRunControls(value: unknown): value is BenchmarkRunControls {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.warmup === "number" &&
    typeof value.samples === "number" &&
    typeof value.iterations === "number"
  )
}

function isBenchmarkRuntimeMetadata(
  value: unknown,
): value is BenchmarkRuntimeMetadata {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.node_version === "string" &&
    typeof value.platform === "string" &&
    typeof value.arch === "string"
  )
}

function isBenchmarkScenarioSummary(
  value: unknown,
): value is BenchmarkScenarioSummary {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    typeof value.warmup === "number" &&
    typeof value.samples === "number" &&
    typeof value.iterations === "number" &&
    typeof value.checksum === "number" &&
    typeof value.min_ms === "number" &&
    typeof value.p50_ms === "number" &&
    typeof value.p95_ms === "number" &&
    typeof value.max_ms === "number" &&
    typeof value.mean_ms === "number"
  )
}

export function isBenchmarkResultsV1(
  value: unknown,
): value is BenchmarkResultsV1 {
  if (isRecord(value) === false) {
    return false
  }

  return (
    value.schema_version === BENCHMARK_RESULT_SCHEMA_VERSION &&
    typeof value.generated_at === "string" &&
    typeof value.git_commit === "string" &&
    isBenchmarkRuntimeMetadata(value.runtime) &&
    isBenchmarkRunControls(value.controls) &&
    Array.isArray(value.scenarios) &&
    value.scenarios.every((scenario) => isBenchmarkScenarioSummary(scenario))
  )
}

export function assertBenchmarkSchemaCompatibility(value: unknown): void {
  if (isRecord(value) === false) {
    throw new TypeError("Benchmark baseline must be a JSON object.")
  }

  if (typeof value.schema_version !== "string") {
    throw new TypeError(
      "Benchmark baseline schema_version must be a string value.",
    )
  }

  if (value.schema_version !== BENCHMARK_RESULT_SCHEMA_VERSION) {
    throw new TypeError(
      `Benchmark baseline schema_version '${value.schema_version}' is incompatible with expected '${BENCHMARK_RESULT_SCHEMA_VERSION}'.`,
    )
  }
}

export function assertBenchmarkResultsV1(
  value: unknown,
): asserts value is BenchmarkResultsV1 {
  if (isBenchmarkResultsV1(value) === false) {
    throw new TypeError("Value does not match BenchmarkResultsV1")
  }
}

export function createBenchmarkRuntimeMetadata(): BenchmarkRuntimeMetadata {
  return {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
  }
}
