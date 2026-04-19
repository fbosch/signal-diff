import test from "node:test"

import { buildStubReviewSurfaceFromRequest } from "../packages/cli/src/index.ts"
import { createReviewJsonReportV1 } from "../packages/reporting/src/index.ts"
import {
  assertGoldenJson,
  assertGoldenText,
  loadFixtureCase,
  renderFixtureMarkdownSummary,
} from "./fixture-harness.ts"

test("fixture harness snapshots a stub analyzer response", () => {
  const fixtureCase = loadFixtureCase("stub-single-file")
  const reviewSurface = buildStubReviewSurfaceFromRequest(fixtureCase.request)
  const report = createReviewJsonReportV1(reviewSurface)

  assertGoldenJson(fixtureCase, "report.json", report)
  assertGoldenText(
    fixtureCase,
    "report.md",
    `${renderFixtureMarkdownSummary(report)}\n`,
  )
})
