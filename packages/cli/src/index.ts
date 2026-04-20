import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
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
  type TsconfigProject,
  type WorkspacePackage,
} from "@signal-diff/core"
import { stubHeuristic } from "@signal-diff/heuristics"
import { jsonReportRenderer } from "@signal-diff/reporting"
import ts from "typescript"

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

function normalizePath(value: string): string {
  return value.split(path.sep).join("/")
}

function toRepoRelativePath(repoRoot: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(repoRoot, filePath)

  return normalizePath(path.relative(repoRoot, absolutePath))
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"))
}

interface ParsedTsconfigProject {
  references: string[]
  referenceConfigPaths: string[]
  baseUrl?: string
  pathAliases?: Record<string, string[]>
}

function parseTsconfigProject(
  repoRoot: string,
  tsconfigPath: string,
): ParsedTsconfigProject | null {
  const parseHost: ts.ParseConfigFileHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    fileExists: ts.sys.fileExists,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    readDirectory: ts.sys.readDirectory,
    readFile: ts.sys.readFile,
    trace: () => {},
    onUnRecoverableConfigFileDiagnostic: () => {},
  }

  const parsed = ts.getParsedCommandLineOfConfigFile(
    tsconfigPath,
    {},
    parseHost,
  )

  if (parsed === undefined) {
    return null
  }

  const referenceConfigPaths: string[] = []

  for (const reference of parsed.projectReferences ?? []) {
    const resolvedReferencePath = ts.resolveProjectReferencePath(reference)

    if (!existsSync(resolvedReferencePath)) {
      continue
    }

    referenceConfigPaths.push(path.resolve(resolvedReferencePath))
  }

  const references = [...new Set(referenceConfigPaths)]
    .map((referencePath) => toRepoRelativePath(repoRoot, referencePath))
    .sort((left, right) => left.localeCompare(right))

  const optionsBaseUrl =
    typeof parsed.options.baseUrl === "string"
      ? parsed.options.baseUrl
      : undefined
  const optionsPathsBasePath =
    typeof parsed.options.pathsBasePath === "string"
      ? parsed.options.pathsBasePath
      : undefined
  const aliasBasePath =
    optionsBaseUrl ??
    optionsPathsBasePath ??
    path.dirname(path.resolve(tsconfigPath))

  const rawPaths =
    parsed.options.paths === undefined
      ? undefined
      : (parsed.options.paths as Record<string, string[]>)
  let pathAliases: Record<string, string[]> | undefined

  if (rawPaths !== undefined) {
    const normalizedAliases: Record<string, string[]> = {}

    for (const [alias, targets] of Object.entries(rawPaths)) {
      const normalizedTargets = [...new Set(targets)]
        .map((target) => {
          const absoluteTarget = path.isAbsolute(target)
            ? target
            : path.resolve(aliasBasePath, target)

          return toRepoRelativePath(repoRoot, absoluteTarget)
        })
        .sort((left, right) => left.localeCompare(right))

      normalizedAliases[alias] = normalizedTargets
    }

    if (Object.keys(normalizedAliases).length > 0) {
      pathAliases = normalizedAliases
    }
  }

  const normalizedBaseUrl =
    optionsBaseUrl === undefined
      ? undefined
      : toRepoRelativePath(repoRoot, optionsBaseUrl) || "."

  return {
    references,
    referenceConfigPaths: [...new Set(referenceConfigPaths)].sort(
      (left, right) => left.localeCompare(right),
    ),
    baseUrl: normalizedBaseUrl,
    pathAliases,
  }
}

function normalizeWorkspaceRoot(
  repoRoot: string,
  workspaceRoot: string,
): string {
  const normalized = path.isAbsolute(workspaceRoot)
    ? toRepoRelativePath(repoRoot, workspaceRoot)
    : normalizePath(path.normalize(workspaceRoot))

  const trimmed = normalized.replace(/^\.\//, "").replace(/\/$/, "")

  return trimmed === "" ? "." : trimmed
}

function normalizeWorkspaceRoots(
  repoRoot: string,
  workspaceRoots: string[],
): string[] {
  const seen = new Set<string>()
  const normalizedRoots: string[] = []

  for (const workspaceRoot of workspaceRoots) {
    const normalizedRoot = normalizeWorkspaceRoot(repoRoot, workspaceRoot)

    if (seen.has(normalizedRoot)) {
      continue
    }

    seen.add(normalizedRoot)
    normalizedRoots.push(normalizedRoot)
  }

  return normalizedRoots
}

function discoverWorkspacePatterns(repoRoot: string): string[] {
  const patterns: string[] = []
  const pnpmWorkspaceFilePath = path.join(repoRoot, "pnpm-workspace.yaml")

  if (existsSync(pnpmWorkspaceFilePath)) {
    const workspaceFile = readFileSync(pnpmWorkspaceFilePath, "utf8")
    let inPackagesSection = false
    let packagesIndent = 0

    for (const line of workspaceFile.split("\n")) {
      const trimmedLine = line.trim()

      if (trimmedLine === "" || trimmedLine.startsWith("#")) {
        continue
      }

      const lineIndent = line.search(/\S|$/)

      if (!inPackagesSection) {
        if (/^packages\s*:\s*$/.test(trimmedLine)) {
          inPackagesSection = true
          packagesIndent = lineIndent
        }

        continue
      }

      if (lineIndent <= packagesIndent && !trimmedLine.startsWith("-")) {
        inPackagesSection = false

        if (/^packages\s*:\s*$/.test(trimmedLine)) {
          inPackagesSection = true
          packagesIndent = lineIndent
        }

        continue
      }

      if (!trimmedLine.startsWith("-")) {
        continue
      }

      let pattern = trimmedLine.slice(1).trim()

      if (pattern === "") {
        continue
      }

      if (pattern.startsWith('"') || pattern.startsWith("'")) {
        const quote = pattern[0]
        const closingIndex = pattern.indexOf(quote, 1)

        if (closingIndex > 0) {
          pattern = pattern.slice(1, closingIndex)
        } else {
          pattern = pattern.slice(1)
        }
      } else {
        pattern = pattern.split(/\s+#/)[0]?.trim() ?? ""
      }

      if (pattern !== "") {
        patterns.push(pattern)
      }
    }
  }

  const packageJsonFilePath = path.join(repoRoot, "package.json")

  if (!existsSync(packageJsonFilePath)) {
    return patterns
  }

  let packageJson: unknown
  try {
    packageJson = readJsonFile(packageJsonFilePath)
  } catch {
    return patterns
  }

  if (typeof packageJson !== "object" || packageJson === null) {
    return patterns
  }

  const workspaces = (packageJson as { workspaces?: unknown }).workspaces

  if (Array.isArray(workspaces)) {
    for (const entry of workspaces) {
      if (typeof entry === "string") {
        patterns.push(entry)
      }
    }

    return patterns
  }

  if (typeof workspaces !== "object" || workspaces === null) {
    return patterns
  }

  const workspacePackages = (workspaces as { packages?: unknown }).packages

  if (!Array.isArray(workspacePackages)) {
    return patterns
  }

  for (const entry of workspacePackages) {
    if (typeof entry === "string") {
      patterns.push(entry)
    }
  }

  return patterns
}

function expandWorkspacePattern(repoRoot: string, pattern: string): string[] {
  const normalizedPattern = normalizePath(pattern)

  const segments = normalizedPattern
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "" && segment !== ".")

  const results: string[] = []

  function visit(currentDirectory: string, segmentIndex: number): void {
    if (segmentIndex >= segments.length) {
      const packageJsonPath = path.join(currentDirectory, "package.json")

      if (existsSync(packageJsonPath)) {
        results.push(toRepoRelativePath(repoRoot, currentDirectory))
      }

      return
    }

    const segment = segments[segmentIndex]

    if (segment === "**") {
      visit(currentDirectory, segmentIndex + 1)

      if (!existsSync(currentDirectory)) {
        return
      }

      for (const entry of readdirSync(currentDirectory, {
        withFileTypes: true,
      })) {
        if (!entry.isDirectory()) {
          continue
        }

        visit(path.join(currentDirectory, entry.name), segmentIndex)
      }

      return
    }

    if (segment === "*") {
      if (!existsSync(currentDirectory)) {
        return
      }

      for (const entry of readdirSync(currentDirectory, {
        withFileTypes: true,
      })) {
        if (!entry.isDirectory()) {
          continue
        }

        visit(path.join(currentDirectory, entry.name), segmentIndex + 1)
      }

      return
    }

    visit(path.join(currentDirectory, segment), segmentIndex + 1)
  }

  visit(repoRoot, 0)

  return results
}

function discoverWorkspacePackages(repoRoot: string): WorkspacePackage[] {
  const workspaceRoots = new Set<string>()

  for (const pattern of discoverWorkspacePatterns(repoRoot)) {
    for (const expandedPath of expandWorkspacePattern(repoRoot, pattern)) {
      workspaceRoots.add(expandedPath)
    }
  }

  return [...workspaceRoots]
    .sort((left, right) => left.localeCompare(right))
    .map((packageRoot) => ({ packageRoot }))
}

function discoverTsconfigProjects(
  repoRoot: string,
  workspaceRoots: string[],
): TsconfigProject[] {
  const queuedPaths = new Set<string>()
  const visitedPaths = new Set<string>()
  const queue: string[] = []
  const projects: TsconfigProject[] = []

  function queueTsconfig(tsconfigPath: string): void {
    const resolvedPath = path.resolve(tsconfigPath)

    if (queuedPaths.has(resolvedPath)) {
      return
    }

    if (!existsSync(resolvedPath)) {
      return
    }

    queuedPaths.add(resolvedPath)
    queue.push(resolvedPath)
  }

  queueTsconfig(path.join(repoRoot, "tsconfig.json"))

  for (const workspaceRoot of workspaceRoots) {
    const workspaceRootPath = path.resolve(repoRoot, workspaceRoot)

    queueTsconfig(path.join(workspaceRootPath, "tsconfig.json"))
  }

  while (queue.length > 0) {
    const currentPath = queue.shift()

    if (currentPath === undefined || visitedPaths.has(currentPath)) {
      continue
    }

    visitedPaths.add(currentPath)

    const loadedTsconfig = parseTsconfigProject(repoRoot, currentPath)

    if (loadedTsconfig === null) {
      continue
    }

    for (const referenceConfigPath of loadedTsconfig.referenceConfigPaths) {
      queueTsconfig(referenceConfigPath)
    }

    const project: TsconfigProject = {
      configPath: toRepoRelativePath(repoRoot, currentPath),
      references: loadedTsconfig.references,
    }

    if (loadedTsconfig.baseUrl !== undefined) {
      project.baseUrl = loadedTsconfig.baseUrl
    }

    if (loadedTsconfig.pathAliases !== undefined) {
      project.pathAliases = loadedTsconfig.pathAliases
    }

    projects.push(project)
  }

  return projects.sort((left, right) =>
    left.configPath.localeCompare(right.configPath),
  )
}

export function loadRepoContextFromGit(input: GitRepoContextInput) {
  const resolvedBaseRef = resolveGitCommit(input.repoRoot, input.baseRef)
  const resolvedHeadRef = resolveGitCommit(input.repoRoot, input.headRef)
  const changedFiles = loadChangedFilesFromGit(
    input.repoRoot,
    resolvedBaseRef,
    resolvedHeadRef,
  )
  const workspacePackages = discoverWorkspacePackages(input.repoRoot)
  const rawWorkspaceRoots = input.workspaceRoots ?? [
    ".",
    ...workspacePackages.map((entry) => entry.packageRoot),
  ]
  const workspaceRoots = normalizeWorkspaceRoots(
    input.repoRoot,
    rawWorkspaceRoots,
  )
  const tsconfigProjects = discoverTsconfigProjects(
    input.repoRoot,
    workspaceRoots,
  )

  return {
    repoRoot: input.repoRoot,
    workspaceRoots,
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
    workspacePackages,
    tsconfigProjects,
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
