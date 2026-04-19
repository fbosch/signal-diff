export type CanonicalEntityKind = "file" | "module" | "function"

export interface CanonicalEntity {
  id: string
  kind: CanonicalEntityKind
  name: string
  path: string
}

export interface ReviewFinding {
  id: string
  kind: string
  summary: string
  evidenceEntityIds: string[]
}

export interface ReviewSurface {
  entities: CanonicalEntity[]
  findings: ReviewFinding[]
}

export function createEmptyReviewSurface(): ReviewSurface {
  return {
    entities: [],
    findings: [],
  }
}
