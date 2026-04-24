import assert from "node:assert/strict"
import test from "node:test"

import {
  assertComparableBenchmarkRuns,
  parseDriftThresholdsFromArgs,
} from "../benchmarks/compare.ts"
import {
  BENCHMARK_RESULT_SCHEMA_VERSION,
  type BenchmarkResultsV1,
} from "../benchmarks/contracts.ts"

function createResult(
  controls: { warmup: number; samples: number; iterations: number },
  runtime: { node_version: string; platform: string; arch: string },
): BenchmarkResultsV1 {
  return {
    schema_version: BENCHMARK_RESULT_SCHEMA_VERSION,
    generated_at: "2026-04-24T00:00:00.000Z",
    git_commit: "0123456789abcdef0123456789abcdef01234567",
    runtime,
    controls,
    scenarios: [
      {
        id: "parse-diff-hunks",
        description: "Parse deterministic unified diff hunks",
        warmup: controls.warmup,
        samples: controls.samples,
        iterations: controls.iterations,
        checksum: 100,
        min_ms: 1,
        p50_ms: 1,
        p95_ms: 1,
        max_ms: 1,
        mean_ms: 1,
      },
    ],
  }
}

test("comparator rejects benchmark control mismatches", () => {
  const baseline = createResult(
    { warmup: 2, samples: 12, iterations: 30 },
    { node_version: "v22.0.0", platform: "linux", arch: "x64" },
  )
  const current = createResult(
    { warmup: 1, samples: 8, iterations: 25 },
    { node_version: "v22.0.0", platform: "linux", arch: "x64" },
  )

  assert.throws(
    () => assertComparableBenchmarkRuns(baseline, current),
    /Benchmark controls mismatch/,
  )
})

test("comparator allows same controls even when runtime differs", () => {
  const baseline = createResult(
    { warmup: 2, samples: 12, iterations: 30 },
    { node_version: "v22.0.0", platform: "linux", arch: "x64" },
  )
  const current = createResult(
    { warmup: 2, samples: 12, iterations: 30 },
    { node_version: "v24.0.0", platform: "darwin", arch: "arm64" },
  )

  assert.doesNotThrow(() => assertComparableBenchmarkRuns(baseline, current))
})

test("threshold parser accepts explicit warn/fail values", () => {
  const thresholds = parseDriftThresholdsFromArgs([
    "--warn-threshold=12.5",
    "--fail-threshold=30",
  ])

  assert.deepEqual(thresholds, {
    warn_percent: 12.5,
    fail_percent: 30,
  })
})

test("threshold parser rejects fail threshold below warn threshold", () => {
  assert.throws(
    () =>
      parseDriftThresholdsFromArgs([
        "--warn-threshold=20",
        "--fail-threshold=10",
      ]),
    /--fail-threshold must be greater than or equal to --warn-threshold/,
  )
})
