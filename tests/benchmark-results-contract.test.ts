import assert from "node:assert/strict"
import test from "node:test"

import {
  assertBenchmarkResultsV1,
  assertBenchmarkSchemaCompatibility,
  BENCHMARK_RESULT_SCHEMA_VERSION,
  type BenchmarkResultsV1,
} from "../benchmarks/contracts.ts"

function createValidBenchmarkResult(): BenchmarkResultsV1 {
  return {
    schema_version: BENCHMARK_RESULT_SCHEMA_VERSION,
    generated_at: "2026-04-21T12:00:00.000Z",
    git_commit: "0123456789abcdef0123456789abcdef01234567",
    runtime: {
      node_version: "v25.2.1",
      platform: "linux",
      arch: "x64",
    },
    controls: {
      warmup: 1,
      samples: 8,
      iterations: 25,
    },
    scenarios: [
      {
        id: "parse-diff-hunks",
        description: "Parse deterministic unified diff hunks",
        warmup: 1,
        samples: 8,
        iterations: 25,
        checksum: 320,
        min_ms: 0.04,
        p50_ms: 0.06,
        p95_ms: 0.08,
        max_ms: 0.1,
        mean_ms: 0.06,
      },
    ],
  }
}

test("benchmark result contract accepts valid v1 payload", () => {
  const value = createValidBenchmarkResult()

  assert.doesNotThrow(() => {
    assertBenchmarkSchemaCompatibility(value)
    assertBenchmarkResultsV1(value)
  })
})

test("benchmark result contract rejects incompatible schema version", () => {
  const value = {
    ...createValidBenchmarkResult(),
    schema_version: "v2alpha0",
  }

  assert.throws(
    () => assertBenchmarkSchemaCompatibility(value),
    /schema_version 'v2alpha0' is incompatible/,
  )
})
