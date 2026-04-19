import type { ReviewSurface } from "@signal-diff/core"

export function renderReviewSurfaceJson(reviewSurface: ReviewSurface): string {
  return JSON.stringify(reviewSurface, null, 2)
}
