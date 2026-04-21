import path from "node:path"
import { fileURLToPath } from "node:url"

import { createTypeScriptExtractionResult } from "../packages/adapter-typescript/src/index.ts"
import { parseDiffHunkReferences } from "../packages/cli/src/index.ts"
import type { ReviewRequest } from "../packages/core/src/index.ts"

export interface BenchmarkScenario {
  id: string
  description: string
  run: () => number
}

const BENCHMARKS_ROOT = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_REPO_ROOT = path.resolve(BENCHMARKS_ROOT, "fixtures/ts-monorepo")

function createDeterministicDiffFixture(): string {
  const sections: string[] = []

  for (let index = 0; index < 40; index += 1) {
    const paddedIndex = String(index).padStart(2, "0")
    const filePath = `packages/app/src/file-${paddedIndex}.ts`
    sections.push(
      `diff --git a/${filePath} b/${filePath}`,
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -1,2 +1,2 @@`,
      `-export const value${paddedIndex} = ${index}`,
      `+export const value${paddedIndex} = ${index + 1}`,
      `@@ -20,2 +20,2 @@`,
      `-export const label${paddedIndex} = "before"`,
      `+export const label${paddedIndex} = "after"`,
    )
  }

  return sections.join("\n")
}

const diffFixture = createDeterministicDiffFixture()

const extractionRequest: ReviewRequest = {
  repoContext: {
    repoRoot: FIXTURE_REPO_ROOT,
    workspaceRoots: [FIXTURE_REPO_ROOT],
    baseRef: "bench-base",
    headRef: "bench-head",
    changedFiles: [
      { path: "packages/app/src/view.tsx", kind: "source" },
      { path: "packages/app/src/index.ts", kind: "source" },
    ],
    tsconfigProjects: [
      {
        configPath: "tsconfig.json",
        references: ["packages/app/tsconfig.json"],
      },
      {
        configPath: "packages/app/tsconfig.json",
        references: [],
      },
    ],
  },
  format: "json",
  maxFindings: 20,
  includeDiffHunks: false,
}

export const benchmarkScenarios: BenchmarkScenario[] = [
  {
    id: "parse-diff-hunks",
    description: "Parse deterministic unified diff hunks",
    run: () => parseDiffHunkReferences(diffFixture).length,
  },
  {
    id: "typescript-extraction",
    description: "Extract canonical entities from fixture monorepo",
    run: () =>
      createTypeScriptExtractionResult(extractionRequest).entities.length,
  },
]
