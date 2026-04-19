import type {
  Heuristic,
  HeuristicContext,
  ReviewFinding,
  ReviewPriority,
} from "@signal-diff/core"

function getPriority(context: HeuristicContext): ReviewPriority {
  if (context.entities.length > 3) {
    return "high"
  }

  return context.entities.length > 1 ? "medium" : "low"
}

export function inferStubFindings(context: HeuristicContext): ReviewFinding[] {
  if (context.entities.length === 0) {
    return []
  }

  return [
    {
      id: "finding:changed-module",
      kind: "elevated_review_priority",
      priority: getPriority(context),
      title: "Changed module requires review",
      description: `Detected ${context.entities.length} changed canonical entit${context.entities.length === 1 ? "y" : "ies"}.`,
      evidence: {
        changedEntityIds: context.entities.map((entity) => entity.id),
        relatedEntityIds: [],
        peerAnchorEntityIds: [],
        companionEntityIds: [],
        relationshipIds: [],
        changeIds: context.changes.map((change) => change.id),
        diffHunks: context.diffReferences,
        supportingNotes: [
          "Stub heuristic wires canonical change and diff evidence through the core finding model.",
        ],
      },
    },
  ]
}

export const stubHeuristic: Heuristic = {
  id: "stub-elevated-review-priority",
  analyze(context: HeuristicContext): ReviewFinding[] {
    return inferStubFindings(context)
  },
}
