import { createTypeScriptStubExtractionResult } from "@signal-diff/adapter-typescript"
import {
  createEmptyReviewSurface,
  createReviewOverview,
  type HeuristicContext,
  type ReviewPipeline,
  type ReviewRequest,
  type ReviewSurface,
} from "@signal-diff/core"
import { stubHeuristic } from "@signal-diff/heuristics"
import { jsonReportRenderer } from "@signal-diff/reporting"

export function buildStubReviewSurface(filePath: string): ReviewSurface {
  const request: ReviewRequest = {
    repoContext: {
      repoRoot: "/repo",
      workspaceRoots: ["/repo"],
      baseRef: "origin/master",
      headRef: "HEAD",
      changedFiles: [
        {
          path: filePath,
          kind: "source",
        },
      ],
    },
    format: "json",
    maxFindings: 20,
    includeDiffHunks: true,
  }

  const extraction = createTypeScriptStubExtractionResult(request)
  const heuristicContext: HeuristicContext = {
    repoContext: extraction.repoContext,
    entities: extraction.entities,
    relationships: extraction.relationships,
    changes: extraction.changes,
    diffReferences: extraction.diffReferences,
  }
  const findings = stubHeuristic.analyze(heuristicContext)
  const reviewSurface = createEmptyReviewSurface()

  reviewSurface.overview = createReviewOverview(
    request.repoContext.changedFiles.length,
    extraction.entities.length,
    findings,
  )
  reviewSurface.entities = extraction.entities
  reviewSurface.relationships = extraction.relationships
  reviewSurface.changes = extraction.changes
  reviewSurface.findings = findings
  reviewSurface.diffReferences = extraction.diffReferences

  return reviewSurface
}

export function buildStubCliOutput(filePath: string): string {
  return jsonReportRenderer.render(buildStubReviewSurface(filePath))
}

export const stubReviewPipeline: ReviewPipeline = {
  analyze(request: ReviewRequest): ReviewSurface {
    if (request.repoContext.changedFiles.length === 0) {
      return createEmptyReviewSurface()
    }

    return buildStubReviewSurface(request.repoContext.changedFiles[0].path)
  },
}
