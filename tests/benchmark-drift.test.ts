import assert from "node:assert/strict"
import test from "node:test"
import {
  BENCHMARK_RESULT_SCHEMA_VERSION,
  type BenchmarkResultsV1,
} from "../benchmarks/contracts.ts"
import {
  analyzeBenchmarkDrift,
  type DriftStatus,
  renderDriftMarkdown,
} from "../benchmarks/drift.ts"

function createResult(meanMs: number, p95Ms: number): BenchmarkResultsV1 {
  return {
    schema_version: BENCHMARK_RESULT_SCHEMA_VERSION,
    generated_at: "2026-04-24T00:00:00.000Z",
    git_commit: "0123456789abcdef0123456789abcdef01234567",
    runtime: {
      node_version: "v22.0.0",
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
        checksum: 100,
        min_ms: meanMs,
        p50_ms: meanMs,
        p95_ms: p95Ms,
        max_ms: p95Ms,
        mean_ms: meanMs,
      },
    ],
  }
}

function assertStatus(status: DriftStatus, expected: DriftStatus): void {
  assert.equal(status, expected)
}

test("drift analysis marks pass when deltas are below warn threshold", () => {
  const baseline = createResult(100, 120)
  const current = createResult(104, 129)
  const summary = analyzeBenchmarkDrift(baseline, current)

  assertStatus(summary.overall_status, "pass")
  assertStatus(summary.scenario_drifts[0]?.status ?? "fail", "pass")
})

test("drift analysis marks warn when delta crosses warn threshold", () => {
  const baseline = createResult(100, 120)
  const current = createResult(113, 120)
  const summary = analyzeBenchmarkDrift(baseline, current)

  assertStatus(summary.overall_status, "warn")
  assertStatus(summary.scenario_drifts[0]?.status ?? "fail", "warn")
})

test("drift analysis marks fail when delta crosses fail threshold", () => {
  const baseline = createResult(100, 120)
  const current = createResult(130, 120)
  const summary = analyzeBenchmarkDrift(baseline, current)

  assertStatus(summary.overall_status, "fail")
  assertStatus(summary.scenario_drifts[0]?.status ?? "pass", "fail")
})

test("drift analysis fails when scenario set diverges from baseline", () => {
  const baseline = createResult(100, 120)
  const current = {
    ...createResult(100, 120),
    scenarios: [
      {
        ...createResult(100, 120).scenarios[0],
        id: "typescript-extraction",
      },
    ],
  }
  const summary = analyzeBenchmarkDrift(baseline, current)

  assertStatus(summary.overall_status, "fail")
  assert.deepEqual(summary.missing_scenarios, ["parse-diff-hunks"])
  assert.deepEqual(summary.added_scenarios, ["typescript-extraction"])
})

test("drift markdown includes overall status and scenario rows", () => {
  const baseline = createResult(100, 120)
  const current = createResult(113, 120)
  const summary = analyzeBenchmarkDrift(baseline, current)
  const markdown = renderDriftMarkdown(summary)

  assert.match(markdown, /Overall status: WARN/)
  assert.match(markdown, /parse-diff-hunks/)
  assert.match(markdown, /\+13\.00%/)
  assert.match(markdown, /Top regressions/)
})

test("drift summary includes machine-readable top regressions and improvements", () => {
  const baseline = createResult(100, 120)
  const current = createResult(90, 108)
  const summary = analyzeBenchmarkDrift(baseline, current)

  assert.equal(summary.top_regressions.length, 0)
  assert.equal(summary.top_improvements.length, 1)
  assert.equal(summary.top_improvements[0]?.id, "parse-diff-hunks")
})

test("mixed-metric scenario is excluded from both highlight lists", () => {
  const baseline = createResult(100, 120)
  const current = createResult(130, 108)
  const summary = analyzeBenchmarkDrift(baseline, current)

  assert.equal(summary.top_regressions.length, 0)
  assert.equal(summary.top_improvements.length, 0)
})
