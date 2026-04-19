import assert from "node:assert/strict"
import test from "node:test"

import { buildStubReviewSurface } from "../packages/cli/src/index.ts"

test("workspace scaffold wires canonical review contracts across packages", () => {
  const reviewSurface = buildStubReviewSurface("packages/core/src/index.ts")

  assert.deepEqual(reviewSurface.stageOrder, [
    "overview",
    "finding_detail",
    "evidence",
    "raw_diff",
  ])
  assert.equal(reviewSurface.overview.changedFileCount, 1)
  assert.equal(reviewSurface.overview.changedEntityCount, 1)
  assert.equal(reviewSurface.entities.length, 1)
  assert.equal(reviewSurface.entities[0]?.kind, "module")
  assert.equal(
    reviewSurface.entities[0]?.features.topology.containerPath,
    "packages/core/src/index.ts",
  )
  assert.equal(reviewSurface.changes.length, 1)
  assert.equal(reviewSurface.findings.length, 1)
  assert.deepEqual(reviewSurface.findings[0]?.evidence.changedEntityIds, [
    "ts:packages/core/src/index.ts#module",
  ])
  assert.equal(
    reviewSurface.diffReferences[0]?.filePath,
    "packages/core/src/index.ts",
  )
})
