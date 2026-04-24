import type {
  Heuristic,
  HeuristicContext,
  HeuristicResult,
  ReviewEvidence,
  ReviewFinding,
  ReviewPriority,
} from "@signal-diff/core"

function getPriority(context: HeuristicContext): ReviewPriority {
  if (context.entities.length > 3) {
    return "high"
  }

  return context.entities.length > 1 ? "medium" : "low"
}

export function inferStubHeuristicResult(
  context: HeuristicContext,
): HeuristicResult {
  if (context.entities.length === 0) {
    return {
      findings: [],
      evidence: [],
    }
  }

  const topologyImportFanOutDeltaCount = context.changes.filter(
    (change) => change.featureDeltas.topology.importFanOut !== undefined,
  ).length

  const evidence: ReviewEvidence = {
    id: "evidence:changed-entities",
    changedEntityIds: context.entities.map((entity) => entity.id),
    relatedEntityIds: [],
    peerAnchorEntityIds: [],
    companionEntityIds: [],
    relationshipIds: [],
    changeIds: context.changes.map((change) => change.id),
    diffHunks: context.diffReferences,
    supportingNotes: [
      "Stub heuristic wires canonical change and diff evidence through the core review model.",
      `Detected ${topologyImportFanOutDeltaCount} change(s) with topology.importFanOut feature deltas.`,
    ],
  }

  const findings: ReviewFinding[] = [
    {
      id: "finding:changed-module",
      kind: "elevated_review_priority",
      priority: getPriority(context),
      title: "Changed module requires review",
      description: `Detected ${context.entities.length} changed canonical entit${context.entities.length === 1 ? "y" : "ies"}.`,
      evidenceIds: [evidence.id],
    },
  ]

  return {
    findings,
    evidence: [evidence],
  }
}

export const stubHeuristic: Heuristic = {
  id: "stub-elevated-review-priority",
  analyze(context: HeuristicContext): HeuristicResult {
    return inferStubHeuristicResult(context)
  },
}
