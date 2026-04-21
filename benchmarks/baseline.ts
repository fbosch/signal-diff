import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  assertBenchmarkResultsV1,
  assertBenchmarkSchemaCompatibility,
  type BenchmarkResultsV1,
} from "./contracts.ts"

const BENCHMARKS_ROOT = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_BASELINE_FILE = "benchmark-baseline.v1.json"

export function getDefaultBaselinePath(): string {
  return path.resolve(BENCHMARKS_ROOT, "baselines", DEFAULT_BASELINE_FILE)
}

export function resolveBaselinePath(inputPath: string | undefined): string {
  if (inputPath === undefined || inputPath === "") {
    return getDefaultBaselinePath()
  }

  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath)
}

export function loadBaselineResult(
  baselinePath: string,
): BenchmarkResultsV1 | null {
  if (existsSync(baselinePath) === false) {
    return null
  }

  const parsedValue = JSON.parse(readFileSync(baselinePath, "utf8")) as unknown

  assertBenchmarkSchemaCompatibility(parsedValue)
  assertBenchmarkResultsV1(parsedValue)

  return parsedValue
}

export function writeBaselineResult(
  baselinePath: string,
  result: BenchmarkResultsV1,
): void {
  mkdirSync(path.dirname(baselinePath), { recursive: true })
  writeFileSync(baselinePath, `${JSON.stringify(result, null, 2)}\n`)
}
