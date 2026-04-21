import path from "node:path"
import type {
  CanonicalEntity,
  CanonicalEntityKind,
  ChangedFileKind,
  EntityChange,
  ExtractionAdapter,
  ExtractionResult,
  PublicRole,
  RepoContext,
  ReviewRequest,
} from "@signal-diff/core"
import { createEmptyCanonicalFeatures } from "@signal-diff/core"
import { Project, type SourceFile } from "ts-morph"

export interface TypeScriptAdapterInput {
  filePath: string
  kind: ChangedFileKind
}

const TYPESCRIPT_SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"])

export interface LoadedTypeScriptProject {
  configPath: string
  project: Project
  changedSourceFiles: SourceFile[]
  adjacentSourceFiles: SourceFile[]
}

export interface TypeScriptProjectLoaderResult {
  projects: LoadedTypeScriptProject[]
  changedSourceFiles: SourceFile[]
  adjacentSourceFiles: SourceFile[]
}

function toAbsoluteRepoPath(repoRoot: string, filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath
  }

  return path.resolve(repoRoot, filePath)
}

function toRepoRelativePath(repoRoot: string, absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/")
}

function isTypeScriptSourcePath(filePath: string): boolean {
  return TYPESCRIPT_SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function createProjectFromTsconfig(
  repoRoot: string,
  configPath: string,
): Project {
  const absoluteConfigPath = toAbsoluteRepoPath(repoRoot, configPath)

  try {
    return new Project({
      tsConfigFilePath: absoluteConfigPath,
      skipAddingFilesFromTsConfig: false,
      skipFileDependencyResolution: false,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to load tsconfig project '${configPath}' (${absoluteConfigPath}): ${cause}`,
    )
  }
}

function collectChangedTypeScriptPaths(repoContext: RepoContext): string[] {
  return repoContext.changedFiles
    .filter((changedFile) => changedFile.kind === "source")
    .map((changedFile) => changedFile.path)
    .filter((filePath) => isTypeScriptSourcePath(filePath))
    .sort((left, right) => left.localeCompare(right))
}

function resolveChangedSourceFile(
  repoRoot: string,
  projects: LoadedTypeScriptProject[],
  changedFilePath: string,
): SourceFile {
  const absolutePath = toAbsoluteRepoPath(repoRoot, changedFilePath)

  for (const loadedProject of projects) {
    const matchedSourceFile = loadedProject.project.getSourceFile(absolutePath)

    if (matchedSourceFile !== undefined) {
      loadedProject.changedSourceFiles.push(matchedSourceFile)
      return matchedSourceFile
    }
  }

  throw new Error(
    `Failed to resolve changed TypeScript source file '${changedFilePath}' from loaded tsconfig projects.`,
  )
}

function collectAdjacentSourceFiles(
  repoRoot: string,
  changedSourceFiles: SourceFile[],
): Map<string, SourceFile> {
  const adjacentByPath = new Map<string, SourceFile>()
  const changedSourceFilePaths = new Set(
    changedSourceFiles.map((sourceFile) => sourceFile.getFilePath()),
  )

  for (const changedSourceFile of changedSourceFiles) {
    for (const siblingSourceFile of changedSourceFile
      .getDirectory()
      .getSourceFiles()) {
      if (siblingSourceFile === changedSourceFile) {
        continue
      }

      const siblingFilePath = siblingSourceFile.getFilePath()

      if (changedSourceFilePaths.has(siblingFilePath)) {
        continue
      }

      const siblingRelativePath = toRepoRelativePath(repoRoot, siblingFilePath)

      if (isTypeScriptSourcePath(siblingRelativePath) === false) {
        continue
      }

      adjacentByPath.set(siblingFilePath, siblingSourceFile)
    }
  }

  return adjacentByPath
}

export function loadTypeScriptProjectsFromRepoContext(
  repoContext: RepoContext,
): TypeScriptProjectLoaderResult {
  const tsconfigProjects = [...(repoContext.tsconfigProjects ?? [])].sort(
    (left, right) => left.configPath.localeCompare(right.configPath),
  )
  const changedTypeScriptPaths = collectChangedTypeScriptPaths(repoContext)

  if (changedTypeScriptPaths.length === 0) {
    return {
      projects: [],
      changedSourceFiles: [],
      adjacentSourceFiles: [],
    }
  }

  const projects: LoadedTypeScriptProject[] = tsconfigProjects.map(
    (tsconfigProject) => ({
      configPath: tsconfigProject.configPath,
      project: createProjectFromTsconfig(
        repoContext.repoRoot,
        tsconfigProject.configPath,
      ),
      changedSourceFiles: [],
      adjacentSourceFiles: [],
    }),
  )

  if (projects.length === 0) {
    throw new Error(
      "Failed to load TypeScript projects: repoContext.tsconfigProjects is empty while changed TypeScript source files exist.",
    )
  }

  const changedSourceFiles = changedTypeScriptPaths.map((changedFilePath) =>
    resolveChangedSourceFile(repoContext.repoRoot, projects, changedFilePath),
  )
  const adjacentByPath = collectAdjacentSourceFiles(
    repoContext.repoRoot,
    changedSourceFiles,
  )
  const adjacentSourceFiles = [...adjacentByPath.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([, sourceFile]) => sourceFile)

  for (const loadedProject of projects) {
    const projectAdjacent = loadedProject.project
      .getSourceFiles()
      .filter((sourceFile) => adjacentByPath.has(sourceFile.getFilePath()))

    loadedProject.adjacentSourceFiles = projectAdjacent.sort((left, right) =>
      left.getFilePath().localeCompare(right.getFilePath()),
    )
  }

  return {
    projects,
    changedSourceFiles,
    adjacentSourceFiles,
  }
}

function getEntityKind(kind: ChangedFileKind): CanonicalEntityKind {
  switch (kind) {
    case "test":
      return "test_artifact"
    case "example":
      return "example_artifact"
    case "configuration":
      return "configuration_unit"
    default:
      return "module"
  }
}

function getPublicRole(kind: ChangedFileKind): PublicRole {
  switch (kind) {
    case "test":
      return "test_only"
    case "example":
      return "example_only"
    default:
      return "unknown"
  }
}

export function createTypeScriptStubEntity(
  input: TypeScriptAdapterInput,
): CanonicalEntity {
  const kind = getEntityKind(input.kind)
  const features = createEmptyCanonicalFeatures(input.filePath)

  features.topology.publicRole = getPublicRole(input.kind)

  return {
    id: `ts:${input.filePath}#${kind}`,
    kind,
    name: input.filePath,
    modulePath: input.filePath,
    exported: input.kind === "source",
    location: {
      filePath: input.filePath,
      startLine: 1,
      endLine: 1,
    },
    features,
  }
}

export function createTypeScriptStubChange(
  entity: CanonicalEntity,
): EntityChange {
  return {
    id: `change:${entity.id}`,
    entityId: entity.id,
    kind: "entity_modified",
    summary: `Detected a changed ${entity.kind} at ${entity.modulePath}.`,
    featureDeltas: {
      summary: [`Changed ${entity.kind} detected from diff scope.`],
      signature: {},
      structural: {},
      behavioral: {},
      topology: {},
    },
  }
}

export function createTypeScriptStubExtractionResult(
  request: ReviewRequest,
): ExtractionResult {
  if (request.repoContext.changedFiles.length === 0) {
    return {
      repoContext: request.repoContext,
      entities: [],
      relationships: [],
      changes: [],
      diffReferences: [],
    }
  }

  const entities = request.repoContext.changedFiles.map((changedFile) =>
    createTypeScriptStubEntity({
      filePath: changedFile.path,
      kind: changedFile.kind,
    }),
  )

  const diffReferences =
    request.includeDiffHunks === false
      ? []
      : (request.repoContext.diffReferences ??
        request.repoContext.changedFiles.map((changedFile) => ({
          filePath: changedFile.path,
          baseStartLine: 1,
          baseLineCount: 1,
          headStartLine: 1,
          headLineCount: 1,
        })))

  return {
    repoContext: request.repoContext,
    entities,
    relationships: [],
    changes: entities.map((entity) => createTypeScriptStubChange(entity)),
    diffReferences,
  }
}

export const typeScriptExtractionAdapter: ExtractionAdapter = {
  language: "typescript",
  extract(request: ReviewRequest): ExtractionResult {
    return createTypeScriptStubExtractionResult(request)
  },
}
