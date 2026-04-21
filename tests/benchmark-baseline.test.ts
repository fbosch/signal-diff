import assert from "node:assert/strict"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import test from "node:test"

import {
  getDefaultBaselinePath,
  loadBaselineResult,
  resolveBaselinePath,
  writeBaselineResult,
} from "../benchmarks/baseline.ts"
import {
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

test("resolveBaselinePath uses default when not set", () => {
  assert.equal(resolveBaselinePath(undefined), getDefaultBaselinePath())
  assert.equal(resolveBaselinePath(""), getDefaultBaselinePath())
})

test("resolveBaselinePath resolves relative paths from cwd", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "signal-diff-baseline-"))
  const previousCwd = process.cwd()

  try {
    process.chdir(tempDir)
    assert.equal(
      resolveBaselinePath("benchmarks/baselines/custom.json"),
      path.join(tempDir, "benchmarks/baselines/custom.json"),
    )
  } finally {
    process.chdir(previousCwd)
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("loadBaselineResult returns null when baseline file is missing", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "signal-diff-baseline-"))

  try {
    const missingPath = path.join(tempDir, "missing.json")
    assert.equal(loadBaselineResult(missingPath), null)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("loadBaselineResult throws for invalid json", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "signal-diff-baseline-"))

  try {
    const baselinePath = path.join(tempDir, "invalid.json")
    writeFileSync(baselinePath, "{ not-json")

    assert.throws(() => loadBaselineResult(baselinePath), SyntaxError)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("loadBaselineResult throws for incompatible schema", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "signal-diff-baseline-"))

  try {
    const baselinePath = path.join(tempDir, "incompatible.json")
    const incompatible = {
      ...createValidBenchmarkResult(),
      schema_version: "v2alpha0",
    }
    writeFileSync(baselinePath, `${JSON.stringify(incompatible, null, 2)}\n`)

    assert.throws(
      () => loadBaselineResult(baselinePath),
      /schema_version 'v2alpha0' is incompatible/,
    )
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test("writeBaselineResult writes deterministic json and is loadable", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "signal-diff-baseline-"))

  try {
    const baselinePath = path.join(tempDir, "benchmarks", "baseline.json")
    const result = createValidBenchmarkResult()

    writeBaselineResult(baselinePath, result)
    const loaded = loadBaselineResult(baselinePath)

    assert.deepEqual(loaded, result)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
})
