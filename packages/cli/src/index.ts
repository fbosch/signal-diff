import { createTypeScriptStubEntity } from "@signal-diff/adapter-typescript"
import { createEmptyReviewSurface } from "@signal-diff/core"
import { inferStubFindings } from "@signal-diff/heuristics"
import { renderReviewSurfaceJson } from "@signal-diff/reporting"

export function buildStubCliOutput(filePath: string): string {
  const entity = createTypeScriptStubEntity({ filePath })
  const reviewSurface = createEmptyReviewSurface()

  reviewSurface.entities.push(entity)
  reviewSurface.findings = inferStubFindings(reviewSurface.entities)

  return renderReviewSurfaceJson(reviewSurface)
}
