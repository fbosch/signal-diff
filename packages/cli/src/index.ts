import { execFileSync } from "node:child_process"

import { createTypeScriptStubExtractionResult } from "@signal-diff/adapter-typescript"
import {
  type ChangedFile,
  type ChangedFileKind,
  createEmptyReviewSurface,
  createReviewOverview,
  type DiffHunkReference,
  type HeuristicContext,
  type ReviewOutputFormat,
  type ReviewPipeline,
  type ReviewRequest,
  type ReviewSurface,
} from "@signal-diff/core"
import { stubHeuristic } from "@signal-diff/heuristics"
import { jsonReportRenderer } from "@signal-diff/reporting"

export interface GitRepoContextInput {
  repoRoot: string
  workspaceRoots?: string[]
  baseRef: string
  headRef: string
}

export interface GitReviewRequestInput extends GitRepoContextInput {
  format: ReviewOutputFormat
  maxFindings: number
  includeDiffHunks: boolean
}

const GIT_OUTPUT_MAX_BUFFER_BYTES = 16 * 1024 * 1024

function runGitCommand(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: GIT_OUTPUT_MAX_BUFFER_BYTES,
  }).trimEnd()
}

export function resolveGitCommit(repoRoot: string, ref: string): string {
  return runGitCommand(repoRoot, [
    "rev-parse",
    "--verify",
    `${ref}^{commit}`,
  ]).trim()
}

export function classifyChangedFilePath(filePath: string): ChangedFileKind {
  const normalizedPath = filePath.toLowerCase()

  if (
    normalizedPath === "readme.md" ||
    normalizedPath.startsWith("docs/") ||
    normalizedPath.endsWith(".md") ||
    normalizedPath.endsWith(".mdx") ||
    normalizedPath.endsWith(".txt")
  ) {
    return "documentation"
  }

  if (
    normalizedPath.startsWith("examples/") ||
    normalizedPath.includes("/examples/") ||
    normalizedPath.includes("/example/") ||
    normalizedPath.includes(".example.")
  ) {
    return "example"
  }

  if (
    normalizedPath.includes("__tests__") ||
    normalizedPath.includes("/test/") ||
    normalizedPath.endsWith(".test.ts") ||
    normalizedPath.endsWith(".test.tsx") ||
    normalizedPath.endsWith(".spec.ts") ||
    normalizedPath.endsWith(".spec.tsx")
  ) {
    return "test"
  }

  if (
    normalizedPath === "package.json" ||
    normalizedPath === "pnpm-lock.yaml" ||
    normalizedPath === "pnpm-workspace.yaml" ||
    normalizedPath === "biome.json" ||
    normalizedPath.startsWith("tsconfig") ||
    normalizedPath.endsWith(".json") ||
    normalizedPath.endsWith(".yaml") ||
    normalizedPath.endsWith(".yml") ||
    normalizedPath.endsWith(".toml") ||
    normalizedPath.startsWith(".github/")
  ) {
    return "configuration"
  }

  if (
    normalizedPath.endsWith(".ts") ||
    normalizedPath.endsWith(".tsx") ||
    normalizedPath.endsWith(".js") ||
    normalizedPath.endsWith(".jsx") ||
    normalizedPath.endsWith(".mts") ||
    normalizedPath.endsWith(".cts") ||
    normalizedPath.endsWith(".mjs") ||
    normalizedPath.endsWith(".cjs")
  ) {
    return "source"
  }

  return "unknown"
}

function loadChangedFilesFromGit(
  repoRoot: string,
  baseRef: string,
  headRef: string,
): ChangedFile[] {
  const output = runGitCommand(repoRoot, [
    "diff",
    "--name-only",
    "--no-renames",
    baseRef,
    headRef,
  ])

  if (output === "") {
    return []
  }

  return output.split("\n").map((filePath) => ({
    path: filePath,
    kind: classifyChangedFilePath(filePath),
  }))
}

export function parseDiffHunkReferences(diffText: string): DiffHunkReference[] {
  const diffReferences: DiffHunkReference[] = []
  let currentFilePath: string | null = null

  for (const line of diffText.split("\n")) {
    const diffMatch = /^diff --git a\/(.+) b\/(.+)$/.exec(line)

    if (diffMatch) {
      const [, beforePath, afterPath] = diffMatch
      currentFilePath = afterPath === "/dev/null" ? beforePath : afterPath
      continue
    }

    const hunkMatch = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line)

    if (hunkMatch && currentFilePath !== null) {
      diffReferences.push({
        filePath: currentFilePath,
        baseStartLine: Number(hunkMatch[1]),
        baseLineCount: Number(hunkMatch[2] ?? "1"),
        headStartLine: Number(hunkMatch[3]),
        headLineCount: Number(hunkMatch[4] ?? "1"),
      })
    }
  }

  return diffReferences
}

function loadDiffHunkReferencesFromGit(
  repoRoot: string,
  baseRef: string,
  headRef: string,
): DiffHunkReference[] {
  const output = runGitCommand(repoRoot, [
    "diff",
    "--no-color",
    "--no-ext-diff",
    "--no-renames",
    "--unified=0",
    baseRef,
    headRef,
  ])

  if (output === "") {
    return []
  }

  return parseDiffHunkReferences(output)
}

export function loadRepoContextFromGit(input: GitRepoContextInput) {
  const resolvedBaseRef = resolveGitCommit(input.repoRoot, input.baseRef)
  const resolvedHeadRef = resolveGitCommit(input.repoRoot, input.headRef)
  const changedFiles = loadChangedFilesFromGit(
    input.repoRoot,
    resolvedBaseRef,
    resolvedHeadRef,
  )

  return {
    repoRoot: input.repoRoot,
    workspaceRoots: input.workspaceRoots ?? [input.repoRoot],
    baseRef: input.baseRef,
    headRef: input.headRef,
    resolvedBaseRef,
    resolvedHeadRef,
    changedFiles,
    diffReferences: loadDiffHunkReferencesFromGit(
      input.repoRoot,
      resolvedBaseRef,
      resolvedHeadRef,
    ),
  }
}

export function createReviewRequestFromGit(
  input: GitReviewRequestInput,
): ReviewRequest {
  return {
    repoContext: loadRepoContextFromGit(input),
    format: input.format,
    maxFindings: input.maxFindings,
    includeDiffHunks: input.includeDiffHunks,
  }
}

export function buildStubReviewSurfaceFromRequest(
  request: ReviewRequest,
): ReviewSurface {
  const extraction = createTypeScriptStubExtractionResult(request)
  const heuristicContext: HeuristicContext = {
    repoContext: extraction.repoContext,
    entities: extraction.entities,
    relationships: extraction.relationships,
    changes: extraction.changes,
    diffReferences: extraction.diffReferences,
  }
  const heuristicResult = stubHeuristic.analyze(heuristicContext)
  const reviewSurface = createEmptyReviewSurface()

  reviewSurface.overview = createReviewOverview(
    request.repoContext.changedFiles.length,
    extraction.entities.length,
    heuristicResult.findings,
  )
  reviewSurface.entities = extraction.entities
  reviewSurface.relationships = extraction.relationships
  reviewSurface.changes = extraction.changes
  reviewSurface.findings = heuristicResult.findings
  reviewSurface.evidence = heuristicResult.evidence
  reviewSurface.diffReferences = extraction.diffReferences

  return reviewSurface
}

export function buildStubReviewSurface(filePath: string): ReviewSurface {
  return buildStubReviewSurfaceFromRequest({
    repoContext: {
      repoRoot: "/repo",
      workspaceRoots: ["/repo"],
      baseRef: "origin/master",
      headRef: "HEAD",
      diffReferences: [
        {
          filePath,
          baseStartLine: 1,
          baseLineCount: 1,
          headStartLine: 1,
          headLineCount: 1,
        },
      ],
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
  })
}

export function buildStubReviewSurfaceFromGit(
  input: GitReviewRequestInput,
): ReviewSurface {
  return buildStubReviewSurfaceFromRequest(createReviewRequestFromGit(input))
}

export function buildStubCliOutput(filePath: string): string {
  return jsonReportRenderer.render(buildStubReviewSurface(filePath))
}

export const stubReviewPipeline: ReviewPipeline = {
  analyze(request: ReviewRequest): ReviewSurface {
    return buildStubReviewSurfaceFromRequest(request)
  },
}
