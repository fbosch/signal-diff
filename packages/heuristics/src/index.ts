import type { CanonicalEntity, ReviewFinding } from "@signal-diff/core"

export function inferStubFindings(
  entities: CanonicalEntity[],
): ReviewFinding[] {
  if (entities.length === 0) {
    return []
  }

  return [
    {
      id: "stub:changed-module",
      kind: "changed-module",
      summary: `Detected ${entities.length} changed module stub(s).`,
      evidenceEntityIds: entities.map((entity) => entity.id),
    },
  ]
}
