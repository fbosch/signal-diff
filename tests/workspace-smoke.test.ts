import assert from "node:assert/strict"
import test from "node:test"

import {
  buildStubReviewSurface,
  buildStubReviewSurfaceFromRequest,
  stubReviewPipeline,
} from "../packages/cli/src/index.ts"

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

test("stub extraction covers every changed file in the request", () => {
  const reviewSurface = buildStubReviewSurfaceFromRequest({
    repoContext: {
      repoRoot: "/repo",
      workspaceRoots: ["/repo/packages/a", "/repo/packages/b"],
      baseRef: "origin/master",
      headRef: "HEAD",
      changedFiles: [
        {
          path: "packages/core/src/index.ts",
          kind: "source",
        },
        {
          path: "packages/cli/src/index.ts",
          kind: "source",
        },
      ],
    },
    format: "json",
    maxFindings: 20,
    includeDiffHunks: true,
  })

  assert.equal(reviewSurface.overview.changedFileCount, 2)
  assert.equal(reviewSurface.overview.changedEntityCount, 2)
  assert.equal(reviewSurface.entities.length, 2)
  assert.equal(reviewSurface.changes.length, 2)
  assert.equal(reviewSurface.diffReferences.length, 2)
  assert.deepEqual(
    reviewSurface.entities.map((entity) => entity.modulePath),
    ["packages/core/src/index.ts", "packages/cli/src/index.ts"],
  )
})

test("stub pipeline preserves caller request context", () => {
  const reviewSurface = stubReviewPipeline.analyze({
    repoContext: {
      repoRoot: "/custom-repo",
      workspaceRoots: ["/custom-repo/packages/app"],
      baseRef: "origin/main",
      headRef: "feature/head",
      changedFiles: [
        {
          path: "packages/app/src/a.ts",
          kind: "source",
        },
        {
          path: "packages/app/src/b.ts",
          kind: "source",
        },
      ],
    },
    format: "json",
    maxFindings: 5,
    includeDiffHunks: false,
  })

  assert.equal(reviewSurface.overview.changedFileCount, 2)
  assert.deepEqual(
    reviewSurface.diffReferences.map((diffReference) => diffReference.filePath),
    ["packages/app/src/a.ts", "packages/app/src/b.ts"],
  )
})
