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
import { Node, Project, type SourceFile, SyntaxKind } from "ts-morph"

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

interface CanonicalEntitySeed {
  kind: CanonicalEntityKind
  name: string
  modulePath: string
  exported: boolean
  location: {
    startLine: number
    endLine: number
  }
  scopeName: string
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

function isJsxLikeNode(node: Node | undefined): boolean {
  if (node === undefined) {
    return false
  }

  if (
    node.isKind(SyntaxKind.JsxElement) ||
    node.isKind(SyntaxKind.JsxFragment) ||
    node.isKind(SyntaxKind.JsxSelfClosingElement)
  ) {
    return true
  }

  if (Node.isCallExpression(node)) {
    return node.getExpression().getText() === "React.createElement"
  }

  return false
}

function hasJsxReturnBody(node: Node): boolean {
  if (Node.isArrowFunction(node)) {
    const body = node.getBody()

    if (Node.isBlock(body) === false) {
      return isJsxLikeNode(body)
    }

    return body
      .getDescendantsOfKind(SyntaxKind.ReturnStatement)
      .some((returnStatement) => isJsxLikeNode(returnStatement.getExpression()))
  }

  if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
    const body = node.getBody()

    if (body === undefined) {
      return false
    }

    return body
      .getDescendantsOfKind(SyntaxKind.ReturnStatement)
      .some((returnStatement) => isJsxLikeNode(returnStatement.getExpression()))
  }

  return false
}

function getSeedLocation(node: Node): { startLine: number; endLine: number } {
  return {
    startLine: node.getStartLineNumber(),
    endLine: node.getEndLineNumber(),
  }
}

function getModuleEntitySeed(
  modulePath: string,
  sourceFile: SourceFile,
): CanonicalEntitySeed {
  return {
    kind: "module",
    name: modulePath,
    modulePath,
    exported: true,
    location: {
      startLine: 1,
      endLine: sourceFile.getEndLineNumber(),
    },
    scopeName: "module",
  }
}

function collectTopLevelEntitySeeds(
  modulePath: string,
  sourceFile: SourceFile,
): CanonicalEntitySeed[] {
  const seeds: CanonicalEntitySeed[] = [
    getModuleEntitySeed(modulePath, sourceFile),
  ]

  for (const statement of sourceFile.getStatements()) {
    if (Node.isFunctionDeclaration(statement)) {
      const functionName = statement.getName()

      if (functionName === undefined) {
        continue
      }

      const kind = hasJsxReturnBody(statement) ? "render_unit" : "function"
      seeds.push({
        kind,
        name: functionName,
        modulePath,
        exported: statement.isExported(),
        location: getSeedLocation(statement),
        scopeName: functionName,
      })
      continue
    }

    if (Node.isInterfaceDeclaration(statement)) {
      const contractName = statement.getName()
      seeds.push({
        kind: "contract",
        name: contractName,
        modulePath,
        exported: statement.isExported(),
        location: getSeedLocation(statement),
        scopeName: contractName,
      })
      continue
    }

    if (
      Node.isClassDeclaration(statement) ||
      Node.isTypeAliasDeclaration(statement) ||
      Node.isEnumDeclaration(statement)
    ) {
      const typeName = statement.getName()

      if (typeName !== undefined) {
        seeds.push({
          kind: "type_like_entity",
          name: typeName,
          modulePath,
          exported: statement.isExported(),
          location: getSeedLocation(statement),
          scopeName: typeName,
        })
      }

      if (Node.isClassDeclaration(statement)) {
        for (const member of statement.getMembers()) {
          if (Node.isMethodDeclaration(member)) {
            const methodName = member.getName()
            seeds.push({
              kind: "method",
              name: methodName,
              modulePath,
              exported: false,
              location: getSeedLocation(member),
              scopeName: `${typeName ?? "class"}.${methodName}`,
            })
            continue
          }

          if (Node.isPropertyDeclaration(member)) {
            const fieldName = member.getName()
            seeds.push({
              kind: "field",
              name: fieldName,
              modulePath,
              exported: false,
              location: getSeedLocation(member),
              scopeName: `${typeName ?? "class"}.${fieldName}`,
            })
          }
        }
      }

      continue
    }

    if (Node.isVariableStatement(statement)) {
      for (const declaration of statement.getDeclarations()) {
        const initializer = declaration.getInitializer()

        if (
          Node.isArrowFunction(initializer) === false &&
          Node.isFunctionExpression(initializer) === false
        ) {
          continue
        }

        if (hasJsxReturnBody(initializer) === false) {
          continue
        }

        const renderName = declaration.getName()
        seeds.push({
          kind: "render_unit",
          name: renderName,
          modulePath,
          exported: statement.isExported(),
          location: getSeedLocation(declaration),
          scopeName: renderName,
        })
      }
    }
  }

  return seeds
}

function createCanonicalEntityFromSeed(
  seed: CanonicalEntitySeed,
  ordinal: number,
): CanonicalEntity {
  const features = createEmptyCanonicalFeatures(seed.modulePath)
  const scopedId =
    ordinal === 0 ? seed.scopeName : `${seed.scopeName}:${String(ordinal + 1)}`

  return {
    id: `ts:${seed.modulePath}#${seed.kind}:${scopedId}`,
    kind: seed.kind,
    name: seed.name,
    modulePath: seed.modulePath,
    exported: seed.exported,
    location: {
      filePath: seed.modulePath,
      startLine: seed.location.startLine,
      endLine: seed.location.endLine,
    },
    features,
  }
}

function buildCanonicalEntitiesFromSeeds(
  seeds: CanonicalEntitySeed[],
): CanonicalEntity[] {
  const ordinalByScope = new Map<string, number>()

  return seeds
    .sort((left, right) => {
      if (left.modulePath !== right.modulePath) {
        return left.modulePath.localeCompare(right.modulePath)
      }

      if (left.location.startLine !== right.location.startLine) {
        return left.location.startLine - right.location.startLine
      }

      if (left.location.endLine !== right.location.endLine) {
        return left.location.endLine - right.location.endLine
      }

      return left.scopeName.localeCompare(right.scopeName)
    })
    .map((seed) => {
      const scopeKey = `${seed.modulePath}#${seed.kind}:${seed.scopeName}`
      const nextOrdinal = ordinalByScope.get(scopeKey) ?? 0
      ordinalByScope.set(scopeKey, nextOrdinal + 1)
      return createCanonicalEntityFromSeed(seed, nextOrdinal)
    })
}

function extractSourceEntities(
  repoContext: RepoContext,
  sourceFiles: SourceFile[],
): CanonicalEntity[] {
  const seeds = sourceFiles.flatMap((sourceFile) =>
    collectTopLevelEntitySeeds(
      toRepoRelativePath(repoContext.repoRoot, sourceFile.getFilePath()),
      sourceFile,
    ),
  )

  return buildCanonicalEntitiesFromSeeds(seeds)
}

export function createTypeScriptExtractionResult(
  request: ReviewRequest,
): ExtractionResult {
  const sourceChanges = request.repoContext.changedFiles.filter(
    (changedFile) => changedFile.kind === "source",
  )

  if (
    sourceChanges.length === 0 ||
    (request.repoContext.tsconfigProjects?.length ?? 0) === 0
  ) {
    return createTypeScriptStubExtractionResult(request)
  }

  const loadedProjects = loadTypeScriptProjectsFromRepoContext(
    request.repoContext,
  )
  const sourceEntities = extractSourceEntities(
    request.repoContext,
    loadedProjects.changedSourceFiles,
  )
  const nonSourceEntities = request.repoContext.changedFiles
    .filter((changedFile) => changedFile.kind !== "source")
    .map((changedFile) =>
      createTypeScriptStubEntity({
        filePath: changedFile.path,
        kind: changedFile.kind,
      }),
    )
  const entities = [...sourceEntities, ...nonSourceEntities].sort(
    (left, right) => left.id.localeCompare(right.id),
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
    return createTypeScriptExtractionResult(request)
  },
}
