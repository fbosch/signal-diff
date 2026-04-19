import assert from "node:assert/strict"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { ReviewRequest } from "../packages/core/src/index.ts"
import type { ReviewJsonReportV1 } from "../packages/reporting/src/index.ts"

const FIXTURES_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
)
const UPDATE_GOLDENS = process.env.UPDATE_GOLDENS === "1"

export interface FixtureCase {
  name: string
  request: ReviewRequest
  rootDir: string
}

export function loadFixtureCase(name: string): FixtureCase {
  const rootDir = path.join(FIXTURES_ROOT, name)
  const requestPath = path.join(rootDir, "request.json")
  const request = JSON.parse(readFileSync(requestPath, "utf8")) as {
    name: string
  } & ReviewRequest

  return {
    name: request.name,
    request: {
      repoContext: request.repoContext,
      format: request.format,
      maxFindings: request.maxFindings,
      includeDiffHunks: request.includeDiffHunks,
    },
    rootDir,
  }
}

export function assertGoldenJson(
  fixtureCase: FixtureCase,
  relativePath: string,
  value: ReviewJsonReportV1,
): void {
  const actual = `${JSON.stringify(value, null, 2)}\n`
  const goldenPath = path.join(fixtureCase.rootDir, "golden", relativePath)

  if (UPDATE_GOLDENS || existsSync(goldenPath) === false) {
    mkdirSync(path.dirname(goldenPath), { recursive: true })
    writeFileSync(goldenPath, actual)
  }

  const expected = readFileSync(goldenPath, "utf8")

  assert.deepEqual(JSON.parse(actual), JSON.parse(expected))
}

export function assertGoldenText(
  fixtureCase: FixtureCase,
  relativePath: string,
  actual: string,
): void {
  const goldenPath = path.join(fixtureCase.rootDir, "golden", relativePath)

  if (UPDATE_GOLDENS || existsSync(goldenPath) === false) {
    mkdirSync(path.dirname(goldenPath), { recursive: true })
    writeFileSync(goldenPath, actual)
  }

  const expected = readFileSync(goldenPath, "utf8")

  assert.equal(actual, expected)
}

export function renderFixtureMarkdownSummary(
  report: ReviewJsonReportV1,
): string {
  return [
    "# Stub Fixture Review",
    "",
    `- Changed files: ${report.summary.changed_file_count}`,
    `- Changed entities: ${report.summary.changed_entity_count}`,
    `- Findings: ${report.summary.finding_count}`,
    `- Top findings: ${report.summary.top_finding_ids.join(", ") || "none"}`,
  ].join("\n")
}
