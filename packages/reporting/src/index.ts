import type { ReportRenderer, ReviewSurface } from "@signal-diff/core"

export function renderReviewSurfaceJson(reviewSurface: ReviewSurface): string {
  return JSON.stringify(reviewSurface, null, 2)
}

export const jsonReportRenderer: ReportRenderer = {
  format: "json",
  render(reviewSurface: ReviewSurface): string {
    return renderReviewSurfaceJson(reviewSurface)
  },
}
