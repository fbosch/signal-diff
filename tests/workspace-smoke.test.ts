import assert from "node:assert/strict"
import test from "node:test"

import {
  buildStubReviewSurface,
  buildStubReviewSurfaceFromRequest,
  stubReviewPipeline,
} from "../packages/cli/src/index.ts"
import {
  assertReviewJsonReportV1,
  createReviewJsonReportV1,
  REVIEW_JSON_SCHEMA_VERSION,
  renderReviewSurfaceJson,
} from "../packages/reporting/src/index.ts"

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
  assert.deepEqual(reviewSurface.overview.highestPriorityFindings, [
    "finding:changed-module",
  ])
  assert.equal(reviewSurface.evidence.length, 1)
  assert.deepEqual(reviewSurface.findings[0]?.evidenceIds, [
    "evidence:changed-entities",
  ])
  assert.deepEqual(reviewSurface.evidence[0]?.changedEntityIds, [
    "ts:packages/core/src/index.ts#module",
  ])
  assert.equal(
    reviewSurface.diffReferences[0]?.filePath,
    "packages/core/src/index.ts",
  )
})

test("reporting projects the canonical surface into the v1 JSON contract", () => {
  const reviewSurface = buildStubReviewSurface("packages/core/src/index.ts")
  const report = createReviewJsonReportV1(reviewSurface)

  assert.equal(report.schema_version, REVIEW_JSON_SCHEMA_VERSION)
  assert.deepEqual(report.summary, {
    changed_file_count: 1,
    changed_entity_count: 1,
    finding_count: 1,
    top_finding_ids: ["finding:changed-module"],
  })
  assert.deepEqual(report.changed_entities, [
    {
      id: "ts:packages/core/src/index.ts#module",
      kind: "module",
      name: "packages/core/src/index.ts",
      module_path: "packages/core/src/index.ts",
      exported: true,
    },
  ])
  assert.deepEqual(report.findings[0]?.evidence_ids, [
    "evidence:changed-entities",
  ])
  assert.deepEqual(report.evidence[0]?.changed_entity_ids, [
    "ts:packages/core/src/index.ts#module",
  ])
  assert.equal(
    report.diff_references[0]?.filePath,
    "packages/core/src/index.ts",
  )
})

test("reporting validates serialized v1 JSON output", () => {
  const output = renderReviewSurfaceJson(
    buildStubReviewSurface("packages/core/src/index.ts"),
  )
  const parsed = JSON.parse(output) as unknown

  assertReviewJsonReportV1(parsed)
  assert.equal(parsed.schema_version, REVIEW_JSON_SCHEMA_VERSION)
})

test("reporting rejects malformed nested v1 JSON payloads", () => {
  assert.throws(
    () =>
      assertReviewJsonReportV1({
        schema_version: REVIEW_JSON_SCHEMA_VERSION,
        summary: {
          changed_file_count: 1,
          changed_entity_count: 1,
          top_finding_ids: [123],
        },
        changed_entities: [
          {
            id: "entity:1",
            kind: "module",
            name: "name",
            module_path: "path.ts",
            exported: true,
          },
        ],
        findings: [],
        evidence: [],
        diff_references: [],
      }),
    TypeError,
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
  assert.deepEqual(reviewSurface.overview.highestPriorityFindings, [
    "finding:changed-module",
  ])
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
  assert.equal(reviewSurface.diffReferences.length, 0)
  assert.deepEqual(reviewSurface.evidence[0]?.diffHunks, [])
})

test("stub adapter maps changed file kinds into canonical entity kinds", () => {
  const reviewSurface = buildStubReviewSurfaceFromRequest({
    repoContext: {
      repoRoot: "/repo",
      workspaceRoots: ["/repo"],
      baseRef: "origin/master",
      headRef: "HEAD",
      changedFiles: [
        {
          path: "packages/app/src/spec.test.ts",
          kind: "test",
        },
        {
          path: "examples/demo.ts",
          kind: "example",
        },
        {
          path: "pnpm-workspace.yaml",
          kind: "configuration",
        },
      ],
    },
    format: "json",
    maxFindings: 5,
    includeDiffHunks: true,
  })

  assert.deepEqual(
    reviewSurface.entities.map((entity) => entity.kind),
    ["test_artifact", "example_artifact", "configuration_unit"],
  )
  assert.deepEqual(
    reviewSurface.entities.map((entity) => entity.features.topology.publicRole),
    ["test_only", "example_only", "unknown"],
  )
})
