import { execFileSync } from "node:child_process"
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
  identityKey: string
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
  repoContext: RepoContext,
): EntityChange {
  const summary = [`Detected a changed ${entity.kind} at ${entity.modulePath}.`]
  const topologyDeltas: EntityChange["featureDeltas"]["topology"] = {}

  if (entity.kind === "module") {
    const importFanOutDelta = resolveModuleImportFanOutDelta(
      repoContext,
      entity.modulePath,
    )

    if (importFanOutDelta === null) {
      summary.push(
        "Skipped topology.importFanOut delta because base/head module content was unavailable.",
      )
    } else {
      topologyDeltas.importFanOut = importFanOutDelta
      summary.push(
        `Module import fan-out changed ${importFanOutDelta.before} -> ${importFanOutDelta.after}.`,
      )
    }
  }

  return {
    id: `change:${entity.id}`,
    entityId: entity.id,
    kind: "entity_modified",
    summary: `Detected a changed ${entity.kind} at ${entity.modulePath}.`,
    featureDeltas: {
      summary,
      signature: {},
      structural: {},
      behavioral: {},
      topology: topologyDeltas,
    },
  }
}

function readFileAtGitRef(
  repoRoot: string,
  gitRef: string,
  modulePath: string,
): string | null {
  try {
    return execFileSync("git", ["show", `${gitRef}:${modulePath}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    return null
  }
}

function countModuleImportFanOut(moduleSourceText: string): number {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  })
  const sourceFile = project.createSourceFile("module.ts", moduleSourceText, {
    overwrite: true,
  })
  const staticImportCount = sourceFile.getImportDeclarations().length
  const exportFromCount = sourceFile
    .getExportDeclarations()
    .filter(
      (declaration) => declaration.getModuleSpecifierValue() !== undefined,
    ).length
  const dynamicImportCount = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((expression) => expression.getExpression().getText() === "import")
    .filter((expression) => {
      const firstArgument = expression.getArguments()[0]
      return firstArgument !== undefined && Node.isStringLiteral(firstArgument)
    }).length

  sourceFile.forget()

  return staticImportCount + exportFromCount + dynamicImportCount
}

function resolveModuleImportFanOutDelta(
  repoContext: RepoContext,
  modulePath: string,
): { before: number; after: number } | null {
  const baseRef = repoContext.resolvedBaseRef
  const headRef = repoContext.resolvedHeadRef

  if (baseRef === undefined || headRef === undefined) {
    return null
  }

  const beforeSourceText = readFileAtGitRef(
    repoContext.repoRoot,
    baseRef,
    modulePath,
  )
  const afterSourceText = readFileAtGitRef(
    repoContext.repoRoot,
    headRef,
    modulePath,
  )

  if (beforeSourceText === null || afterSourceText === null) {
    return null
  }

  return {
    before: countModuleImportFanOut(beforeSourceText),
    after: countModuleImportFanOut(afterSourceText),
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
    changes: entities.map((entity) =>
      createTypeScriptStubChange(entity, request.repoContext),
    ),
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

  if (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isFunctionExpression(node)
  ) {
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

function getCallableIdentityKey(
  name: string,
  callable:
    | import("ts-morph").FunctionDeclaration
    | import("ts-morph").MethodDeclaration
    | import("ts-morph").ArrowFunction
    | import("ts-morph").FunctionExpression,
): string {
  const parameterIdentity = callable
    .getParameters()
    .map((parameter) => {
      const restPrefix = parameter.isRestParameter() ? "..." : ""
      const optionalSuffix = parameter.isOptional() ? "?" : ""
      const typeNode = parameter.getTypeNode()
      const typeSuffix = typeNode === undefined ? "" : `:${typeNode.getText()}`
      return `${restPrefix}${parameter.getName()}${optionalSuffix}${typeSuffix}`
    })
    .join(",")

  return `${name}(${parameterIdentity})`
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
    identityKey: "module",
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
        identityKey: getCallableIdentityKey(functionName, statement),
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
        identityKey: contractName,
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
          identityKey: typeName,
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
              identityKey: `${typeName ?? "class"}.${getCallableIdentityKey(methodName, member)}`,
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
              identityKey: `${typeName ?? "class"}.${fieldName}`,
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

        const renderName = declaration.getName()
        const isRenderUnit = hasJsxReturnBody(initializer)
        seeds.push({
          kind: isRenderUnit ? "render_unit" : "function",
          name: renderName,
          modulePath,
          exported: statement.isExported(),
          location: getSeedLocation(declaration),
          identityKey: getCallableIdentityKey(renderName, initializer),
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
    ordinal === 0
      ? seed.identityKey
      : `${seed.identityKey}:${String(ordinal + 1)}`

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

      if (left.identityKey !== right.identityKey) {
        return left.identityKey.localeCompare(right.identityKey)
      }

      if (left.location.startLine !== right.location.startLine) {
        return left.location.startLine - right.location.startLine
      }

      if (left.location.endLine !== right.location.endLine) {
        return left.location.endLine - right.location.endLine
      }

      return left.name.localeCompare(right.name)
    })
    .map((seed) => {
      const scopeKey = `${seed.modulePath}#${seed.kind}:${seed.identityKey}`
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
  const extractedSourceModulePaths = new Set(
    sourceEntities
      .filter((entity) => entity.kind === "module")
      .map((entity) => entity.modulePath),
  )
  const nonSourceEntities = request.repoContext.changedFiles
    .filter(
      (changedFile) =>
        changedFile.kind !== "source" ||
        extractedSourceModulePaths.has(changedFile.path) === false,
    )
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
    changes: entities.map((entity) =>
      createTypeScriptStubChange(entity, request.repoContext),
    ),
    diffReferences,
  }
}

export const typeScriptExtractionAdapter: ExtractionAdapter = {
  language: "typescript",
  extract(request: ReviewRequest): ExtractionResult {
    return createTypeScriptExtractionResult(request)
  },
}
