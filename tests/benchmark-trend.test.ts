import assert from "node:assert/strict"
import test from "node:test"
import {
  BENCHMARK_RESULT_SCHEMA_VERSION,
  type BenchmarkResultsV1,
} from "../benchmarks/contracts.ts"
import {
  analyzeBenchmarkTrend,
  renderBenchmarkTrendMarkdown,
} from "../benchmarks/trend.ts"

interface ScenarioInput {
  id: string
  mean_ms: number
  p95_ms: number
}

interface ResultOptions {
  runtime?: {
    node_version: string
    platform: string
    arch: string
  }
  controls?: {
    warmup: number
    samples: number
    iterations: number
  }
}

function createResult(
  generatedAt: string,
  gitCommit: string,
  scenarios: ScenarioInput[],
  options: ResultOptions = {},
): BenchmarkResultsV1 {
  const controls = options.controls ?? {
    warmup: 2,
    samples: 12,
    iterations: 30,
  }

  return {
    schema_version: BENCHMARK_RESULT_SCHEMA_VERSION,
    generated_at: generatedAt,
    git_commit: gitCommit,
    runtime: options.runtime ?? {
      node_version: "v22.0.0",
      platform: "linux",
      arch: "x64",
    },
    controls,
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      description: scenario.id,
      warmup: controls.warmup,
      samples: controls.samples,
      iterations: controls.iterations,
      checksum: 100,
      min_ms: scenario.mean_ms,
      p50_ms: scenario.mean_ms,
      p95_ms: scenario.p95_ms,
      max_ms: scenario.p95_ms,
      mean_ms: scenario.mean_ms,
    })),
  }
}

test("trend summary ranks sustained regressions and improvements", () => {
  const run1 = createResult("2026-04-20T06:00:00.000Z", "a", [
    { id: "scenario-regress", mean_ms: 100, p95_ms: 120 },
    { id: "scenario-improve", mean_ms: 100, p95_ms: 120 },
    { id: "scenario-mixed", mean_ms: 100, p95_ms: 120 },
  ])
  const run2 = createResult("2026-04-21T06:00:00.000Z", "b", [
    { id: "scenario-regress", mean_ms: 110, p95_ms: 126 },
    { id: "scenario-improve", mean_ms: 90, p95_ms: 108 },
    { id: "scenario-mixed", mean_ms: 120, p95_ms: 108 },
  ])
  const run3 = createResult("2026-04-22T06:00:00.000Z", "c", [
    { id: "scenario-regress", mean_ms: 130, p95_ms: 150 },
    { id: "scenario-improve", mean_ms: 85, p95_ms: 102 },
    { id: "scenario-mixed", mean_ms: 130, p95_ms: 100 },
  ])

  const summary = analyzeBenchmarkTrend(run3, [run1, run2], 5)

  assert.equal(summary.included_runs, 3)
  assert.equal(summary.missing_runs, 2)
  assert.equal(summary.guardrail_status, "pass")
  assert.equal(summary.top_regressions.length, 1)
  assert.equal(summary.top_regressions[0]?.id, "scenario-regress")
  assert.equal(summary.top_improvements.length, 1)
  assert.equal(summary.top_improvements[0]?.id, "scenario-improve")
  assert.equal(
    summary.top_regressions.some(
      (scenario) => scenario.id === "scenario-mixed",
    ),
    false,
  )
  assert.equal(
    summary.top_improvements.some(
      (scenario) => scenario.id === "scenario-mixed",
    ),
    false,
  )
})

test("trend markdown includes window and sustained sections", () => {
  const run1 = createResult("2026-04-20T06:00:00.000Z", "a", [
    { id: "scenario-regress", mean_ms: 100, p95_ms: 120 },
  ])
  const run2 = createResult("2026-04-21T06:00:00.000Z", "b", [
    { id: "scenario-regress", mean_ms: 120, p95_ms: 140 },
  ])
  const summary = analyzeBenchmarkTrend(run2, [run1], 4)
  const markdown = renderBenchmarkTrendMarkdown(summary)

  assert.match(markdown, /Window: 2\/4 runs \(missing 2\)/)
  assert.match(markdown, /Guardrail status: PASS/)
  assert.match(markdown, /Top sustained regressions/)
  assert.match(markdown, /scenario-regress/)
})

test("trend guardrail warns on runtime mismatch with consistent controls", () => {
  const run1 = createResult(
    "2026-04-20T06:00:00.000Z",
    "a",
    [{ id: "scenario-regress", mean_ms: 100, p95_ms: 120 }],
    {
      runtime: {
        node_version: "v22.0.0",
        platform: "linux",
        arch: "x64",
      },
    },
  )
  const run2 = createResult(
    "2026-04-21T06:00:00.000Z",
    "b",
    [{ id: "scenario-regress", mean_ms: 110, p95_ms: 130 }],
    {
      runtime: {
        node_version: "v24.0.0",
        platform: "linux",
        arch: "x64",
      },
    },
  )

  const summary = analyzeBenchmarkTrend(run2, [run1], 5)

  assert.equal(summary.guardrail_status, "warn")
  assert.match(summary.guardrail_messages.join("\n"), /Runtime mismatch/)
})

test("trend guardrail fails on controls mismatch", () => {
  const run1 = createResult(
    "2026-04-20T06:00:00.000Z",
    "a",
    [{ id: "scenario-regress", mean_ms: 100, p95_ms: 120 }],
    {
      controls: {
        warmup: 2,
        samples: 12,
        iterations: 30,
      },
    },
  )
  const run2 = createResult(
    "2026-04-21T06:00:00.000Z",
    "b",
    [{ id: "scenario-regress", mean_ms: 110, p95_ms: 130 }],
    {
      controls: {
        warmup: 1,
        samples: 8,
        iterations: 25,
      },
    },
  )

  const summary = analyzeBenchmarkTrend(run2, [run1], 5)

  assert.equal(summary.guardrail_status, "fail")
  assert.match(summary.guardrail_messages.join("\n"), /Controls mismatch/)
})
