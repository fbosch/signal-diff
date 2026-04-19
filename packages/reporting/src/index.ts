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
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as Partial<ReviewJsonReportV1>

  return (
    candidate.schema_version === REVIEW_JSON_SCHEMA_VERSION &&
    typeof candidate.summary === "object" &&
    candidate.summary !== null &&
    Array.isArray(candidate.changed_entities) &&
    Array.isArray(candidate.findings) &&
    Array.isArray(candidate.evidence) &&
    Array.isArray(candidate.diff_references)
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
