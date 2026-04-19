import type {
  DiffHunkReference,
  ReportRenderer,
  ReviewSurface,
} from "@signal-diff/core"

export const REVIEW_JSON_SCHEMA_VERSION = "v1alpha1"

export interface ReviewJsonSummaryV1 {
  changed_file_count: number
  changed_entity_count: number
  finding_count: number
  top_finding_ids: string[]
}

export interface ReviewJsonChangedEntityV1 {
  id: string
  kind: string
  name: string
  module_path: string
  exported: boolean
}

export interface ReviewJsonFindingV1 {
  id: string
  kind: string
  priority: string
  title: string
  description: string
  evidence_ids: string[]
}

export interface ReviewJsonEvidenceV1 {
  id: string
  changed_entity_ids: string[]
  related_entity_ids: string[]
  peer_anchor_entity_ids: string[]
  companion_entity_ids: string[]
  relationship_ids: string[]
  change_ids: string[]
  diff_hunks: DiffHunkReference[]
  supporting_notes: string[]
}

export interface ReviewJsonReportV1 {
  schema_version: typeof REVIEW_JSON_SCHEMA_VERSION
  summary: ReviewJsonSummaryV1
  changed_entities: ReviewJsonChangedEntityV1[]
  findings: ReviewJsonFindingV1[]
  evidence: ReviewJsonEvidenceV1[]
  diff_references: DiffHunkReference[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isDiffHunkReference(value: unknown): value is DiffHunkReference {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.filePath === "string" &&
    typeof value.baseStartLine === "number" &&
    typeof value.baseLineCount === "number" &&
    typeof value.headStartLine === "number" &&
    typeof value.headLineCount === "number"
  )
}

function isReviewJsonSummaryV1(value: unknown): value is ReviewJsonSummaryV1 {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.changed_file_count === "number" &&
    typeof value.changed_entity_count === "number" &&
    typeof value.finding_count === "number" &&
    isStringArray(value.top_finding_ids)
  )
}

function isReviewJsonChangedEntityV1(
  value: unknown,
): value is ReviewJsonChangedEntityV1 {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    typeof value.name === "string" &&
    typeof value.module_path === "string" &&
    typeof value.exported === "boolean"
  )
}

function isReviewJsonFindingV1(value: unknown): value is ReviewJsonFindingV1 {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    typeof value.priority === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    isStringArray(value.evidence_ids)
  )
}

function isReviewJsonEvidenceV1(value: unknown): value is ReviewJsonEvidenceV1 {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.id === "string" &&
    isStringArray(value.changed_entity_ids) &&
    isStringArray(value.related_entity_ids) &&
    isStringArray(value.peer_anchor_entity_ids) &&
    isStringArray(value.companion_entity_ids) &&
    isStringArray(value.relationship_ids) &&
    isStringArray(value.change_ids) &&
    Array.isArray(value.diff_hunks) &&
    value.diff_hunks.every((diffHunk) => isDiffHunkReference(diffHunk)) &&
    isStringArray(value.supporting_notes)
  )
}

export function createReviewJsonReportV1(
  reviewSurface: ReviewSurface,
): ReviewJsonReportV1 {
  return {
    schema_version: REVIEW_JSON_SCHEMA_VERSION,
    summary: {
      changed_file_count: reviewSurface.overview.changedFileCount,
      changed_entity_count: reviewSurface.overview.changedEntityCount,
      finding_count: reviewSurface.overview.topFindingCount,
      top_finding_ids: reviewSurface.overview.highestPriorityFindings,
    },
    changed_entities: reviewSurface.entities.map((entity) => ({
      id: entity.id,
      kind: entity.kind,
      name: entity.name,
      module_path: entity.modulePath,
      exported: entity.exported,
    })),
    findings: reviewSurface.findings.map((finding) => ({
      id: finding.id,
      kind: finding.kind,
      priority: finding.priority,
      title: finding.title,
      description: finding.description,
      evidence_ids: finding.evidenceIds,
    })),
    evidence: reviewSurface.evidence.map((evidence) => ({
      id: evidence.id,
      changed_entity_ids: evidence.changedEntityIds,
      related_entity_ids: evidence.relatedEntityIds,
      peer_anchor_entity_ids: evidence.peerAnchorEntityIds,
      companion_entity_ids: evidence.companionEntityIds,
      relationship_ids: evidence.relationshipIds,
      change_ids: evidence.changeIds,
      diff_hunks: evidence.diffHunks,
      supporting_notes: evidence.supportingNotes,
    })),
    diff_references: reviewSurface.diffReferences,
  }
}

export function isReviewJsonReportV1(
  value: unknown,
): value is ReviewJsonReportV1 {
  if (isRecord(value) === false) {
    return false
  }

  return (
    value.schema_version === REVIEW_JSON_SCHEMA_VERSION &&
    isReviewJsonSummaryV1(value.summary) &&
    Array.isArray(value.changed_entities) &&
    value.changed_entities.every((entity) =>
      isReviewJsonChangedEntityV1(entity),
    ) &&
    Array.isArray(value.findings) &&
    value.findings.every((finding) => isReviewJsonFindingV1(finding)) &&
    Array.isArray(value.evidence) &&
    value.evidence.every((evidence) => isReviewJsonEvidenceV1(evidence)) &&
    Array.isArray(value.diff_references) &&
    value.diff_references.every((diffReference) =>
      isDiffHunkReference(diffReference),
    )
  )
}

export function assertReviewJsonReportV1(
  value: unknown,
): asserts value is ReviewJsonReportV1 {
  if (isReviewJsonReportV1(value) === false) {
    throw new TypeError("Value does not match ReviewJsonReportV1")
  }
}

export function renderReviewSurfaceJson(reviewSurface: ReviewSurface): string {
  return JSON.stringify(createReviewJsonReportV1(reviewSurface), null, 2)
}

export const jsonReportRenderer: ReportRenderer = {
  format: "json",
  render(reviewSurface: ReviewSurface): string {
    return renderReviewSurfaceJson(reviewSurface)
  },
}
