import { execFileSync } from "node:child_process"
import path from "node:path"
import type {
  CanonicalEntity,
  CanonicalEntityKind,
  ChangedFileKind,
  EntityChange,
  ExtractionAdapter,
  ExtractionResult,
  InputCategory,
  OutputCategory,
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
  const signatureDeltas: EntityChange["featureDeltas"]["signature"] = {}
  const structuralDeltas: EntityChange["featureDeltas"]["structural"] = {}
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

  if (isFunctionLikeEntity(entity)) {
    const signatureDelta = resolveFunctionSignatureDelta(repoContext, entity)
    const structuralDelta = resolveFunctionStructuralDelta(repoContext, entity)

    if (signatureDelta === null) {
      summary.push(
        "Skipped signature feature deltas because base/head callable content was unavailable.",
      )
    } else {
      signatureDeltas.inputArity = signatureDelta.inputArity
      signatureDeltas.inputCategory = signatureDelta.inputCategory
      signatureDeltas.optionalInputCount = signatureDelta.optionalInputCount
      signatureDeltas.defaultInputCount = signatureDelta.defaultInputCount
      signatureDeltas.hasOptionalInputs = signatureDelta.hasOptionalInputs
      signatureDeltas.hasDefaultInputs = signatureDelta.hasDefaultInputs
      signatureDeltas.asyncBehavior = signatureDelta.asyncBehavior
      signatureDeltas.outputCategory = signatureDelta.outputCategory
      summary.push(
        `Function signature changed inputs ${signatureDelta.inputArity.before} -> ${signatureDelta.inputArity.after}, optional inputs ${signatureDelta.optionalInputCount.before} -> ${signatureDelta.optionalInputCount.after}, default inputs ${signatureDelta.defaultInputCount.before} -> ${signatureDelta.defaultInputCount.after}, async ${signatureDelta.asyncBehavior.before} -> ${signatureDelta.asyncBehavior.after}, output ${signatureDelta.outputCategory.before} -> ${signatureDelta.outputCategory.after}.`,
      )
    }

    if (structuralDelta === null) {
      summary.push(
        "Skipped structural feature deltas because base/head callable content was unavailable.",
      )
    } else {
      structuralDeltas.branchCount = structuralDelta.branchCount
      structuralDeltas.helperCallCount = structuralDelta.helperCallCount
      structuralDeltas.hasTryCatch = structuralDelta.hasTryCatch
      summary.push(
        `Function structure changed branches ${structuralDelta.branchCount.before} -> ${structuralDelta.branchCount.after}, helper calls ${structuralDelta.helperCallCount.before} -> ${structuralDelta.helperCallCount.after}, try/catch ${String(structuralDelta.hasTryCatch.before)} -> ${String(structuralDelta.hasTryCatch.after)}.`,
      )
    }
  }

  if (isContractLikeEntity(entity)) {
    const contractShapeDelta = resolveContractShapeDelta(repoContext, entity)

    if (contractShapeDelta === null) {
      summary.push(
        "Skipped signature.memberCount deltas because base/head contract content was unavailable.",
      )
    } else {
      signatureDeltas.memberCount = contractShapeDelta.memberCount
      signatureDeltas.optionalMemberCount =
        contractShapeDelta.optionalMemberCount
      summary.push(
        `Contract shape changed members ${contractShapeDelta.memberCount.before} -> ${contractShapeDelta.memberCount.after}, optional members ${contractShapeDelta.optionalMemberCount.before} -> ${contractShapeDelta.optionalMemberCount.after}.`,
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
      signature: signatureDeltas,
      structural: structuralDeltas,
      behavioral: {},
      topology: topologyDeltas,
    },
  }
}

interface FunctionSignatureSnapshot {
  inputArity: number
  inputCategory: InputCategory
  optionalInputCount: number
  defaultInputCount: number
  hasOptionalInputs: boolean
  hasDefaultInputs: boolean
  asyncBehavior: "sync" | "async"
  outputCategory: OutputCategory
}

interface FunctionSignatureDelta {
  inputArity: { before: number; after: number }
  inputCategory: { before: InputCategory; after: InputCategory }
  optionalInputCount: { before: number; after: number }
  defaultInputCount: { before: number; after: number }
  hasOptionalInputs: { before: boolean; after: boolean }
  hasDefaultInputs: { before: boolean; after: boolean }
  asyncBehavior: { before: "sync" | "async"; after: "sync" | "async" }
  outputCategory: { before: OutputCategory; after: OutputCategory }
}

interface FunctionStructuralSnapshot {
  branchCount: number
  helperCallCount: number
  hasTryCatch: boolean
}

interface FunctionStructuralDelta {
  branchCount: { before: number; after: number }
  helperCallCount: { before: number; after: number }
  hasTryCatch: { before: boolean; after: boolean }
}

interface ContractShapeSnapshot {
  memberCount: number
  optionalMemberCount: number
}

interface ContractShapeDelta {
  memberCount: { before: number; after: number }
  optionalMemberCount: { before: number; after: number }
}

function isFunctionLikeEntity(entity: CanonicalEntity): boolean {
  return (
    entity.kind === "function" ||
    entity.kind === "method" ||
    entity.kind === "render_unit"
  )
}

function isContractLikeEntity(entity: CanonicalEntity): boolean {
  return entity.kind === "contract" || entity.kind === "type_like_entity"
}

function createInMemorySourceFile(
  moduleSourceText: string,
  modulePath: string,
): SourceFile {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  })
  const extension = path.extname(modulePath).toLowerCase()
  const sourceExtension = TYPESCRIPT_SOURCE_EXTENSIONS.has(extension)
    ? extension
    : ".ts"

  return project.createSourceFile(
    `module${sourceExtension}`,
    moduleSourceText,
    {
      overwrite: true,
    },
  )
}

function hasCallableBody(node: Node): boolean {
  if (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isFunctionExpression(node) ||
    Node.isArrowFunction(node)
  ) {
    return node.getBody() !== undefined
  }

  return false
}

function findFunctionLikeNode(
  sourceFile: SourceFile,
  entity: CanonicalEntity,
): Node | null {
  if (entity.kind === "method") {
    const methods = sourceFile
      .getDescendantsOfKind(SyntaxKind.MethodDeclaration)
      .filter((method) => method.getName() === entity.name)

    return methods.find(hasCallableBody) ?? methods[0] ?? null
  }

  const functionDeclarations = sourceFile
    .getFunctions()
    .filter((declaration) => declaration.getName() === entity.name)

  if (functionDeclarations.length > 0) {
    return (
      functionDeclarations.find(hasCallableBody) ??
      functionDeclarations[0] ??
      null
    )
  }

  for (const declaration of sourceFile.getVariableDeclarations()) {
    if (declaration.getName() !== entity.name) {
      continue
    }

    const initializer = declaration.getInitializer()

    if (
      initializer !== undefined &&
      (Node.isArrowFunction(initializer) ||
        Node.isFunctionExpression(initializer))
    ) {
      return initializer
    }
  }

  return null
}

function findContractLikeNode(
  sourceFile: SourceFile,
  entity: CanonicalEntity,
): Node | null {
  const interfaceDeclaration = sourceFile
    .getInterfaces()
    .find((declaration) => declaration.getName() === entity.name)

  if (interfaceDeclaration !== undefined) {
    return interfaceDeclaration
  }

  const typeAliasDeclaration = sourceFile
    .getTypeAliases()
    .find((declaration) => declaration.getName() === entity.name)

  if (typeAliasDeclaration !== undefined) {
    return typeAliasDeclaration
  }

  const classDeclaration = sourceFile
    .getClasses()
    .find((declaration) => declaration.getName() === entity.name)

  if (classDeclaration !== undefined) {
    return classDeclaration
  }

  const enumDeclaration = sourceFile
    .getEnums()
    .find((declaration) => declaration.getName() === entity.name)

  return enumDeclaration ?? null
}

function getCallableParameters(
  callable: Node,
): import("ts-morph").ParameterDeclaration[] {
  if (
    Node.isFunctionDeclaration(callable) ||
    Node.isMethodDeclaration(callable) ||
    Node.isFunctionExpression(callable) ||
    Node.isArrowFunction(callable)
  ) {
    return callable.getParameters()
  }

  return []
}

function getCallableReturnTypeText(callable: Node): string | null {
  if (
    Node.isFunctionDeclaration(callable) ||
    Node.isMethodDeclaration(callable) ||
    Node.isFunctionExpression(callable) ||
    Node.isArrowFunction(callable)
  ) {
    return callable.getReturnTypeNode()?.getText() ?? null
  }

  return null
}

function getInputCategory(
  parameters: import("ts-morph").ParameterDeclaration[],
): InputCategory {
  if (parameters.length === 0) {
    return "none"
  }

  const hasRest = parameters.some((parameter) => parameter.isRestParameter())
  const hasNamed = parameters.some((parameter) =>
    Node.isObjectBindingPattern(parameter.getNameNode()),
  )
  const hasPositional = parameters.some(
    (parameter) =>
      Node.isObjectBindingPattern(parameter.getNameNode()) === false,
  )

  if (hasRest) {
    return parameters.length === 1 ? "variadic" : "mixed"
  }

  if (hasNamed && hasPositional) {
    return "mixed"
  }

  return hasNamed ? "named" : "positional"
}

function getOutputCategory(returnTypeText: string | null): OutputCategory {
  if (returnTypeText === null || returnTypeText.trim() === "") {
    return "unknown"
  }

  const normalized = returnTypeText.trim()
  const lower = normalized.toLowerCase()

  if (lower === "void" || lower === "undefined" || lower === "never") {
    return "void"
  }

  if (lower.startsWith("promise<") || lower === "promise") {
    return "promise"
  }

  if (
    lower.endsWith("[]") ||
    lower.startsWith("array<") ||
    lower.startsWith("readonlyarray<")
  ) {
    return "collection"
  }

  if (
    lower.includes("jsx.element") ||
    lower.includes("reactnode") ||
    lower.includes("reactelement")
  ) {
    return "renderable"
  }

  if (
    lower === "string" ||
    lower === "number" ||
    lower === "boolean" ||
    lower === "bigint" ||
    lower === "symbol"
  ) {
    return "scalar"
  }

  return "object"
}

function snapshotFunctionSignature(
  moduleSourceText: string,
  modulePath: string,
  entity: CanonicalEntity,
): FunctionSignatureSnapshot | null {
  const sourceFile = createInMemorySourceFile(moduleSourceText, modulePath)
  const callable = findFunctionLikeNode(sourceFile, entity)

  if (callable === null) {
    sourceFile.forget()
    return null
  }

  const parameters = getCallableParameters(callable)
  const optionalInputCount = parameters.filter((parameter) =>
    parameter.isOptional(),
  ).length
  const defaultInputCount = parameters.filter(
    (parameter) => parameter.getInitializer() !== undefined,
  ).length
  const asyncBehavior: FunctionSignatureSnapshot["asyncBehavior"] =
    Node.isFunctionDeclaration(callable) ||
    Node.isMethodDeclaration(callable) ||
    Node.isFunctionExpression(callable) ||
    Node.isArrowFunction(callable)
      ? callable.isAsync()
        ? "async"
        : "sync"
      : "sync"
  const snapshot = {
    inputArity: parameters.length,
    inputCategory: getInputCategory(parameters),
    optionalInputCount,
    defaultInputCount,
    hasOptionalInputs: optionalInputCount > 0,
    hasDefaultInputs: defaultInputCount > 0,
    asyncBehavior,
    outputCategory: getOutputCategory(getCallableReturnTypeText(callable)),
  }

  sourceFile.forget()
  return snapshot
}

function resolveFunctionSignatureDelta(
  repoContext: RepoContext,
  entity: CanonicalEntity,
): FunctionSignatureDelta | null {
  const baseRef = repoContext.resolvedBaseRef
  const headRef = repoContext.resolvedHeadRef

  if (baseRef === undefined || headRef === undefined) {
    return null
  }

  const beforeSourceText = readFileAtGitRef(
    repoContext.repoRoot,
    baseRef,
    entity.modulePath,
  )
  const afterSourceText = readFileAtGitRef(
    repoContext.repoRoot,
    headRef,
    entity.modulePath,
  )

  if (beforeSourceText === null || afterSourceText === null) {
    return null
  }

  const beforeSnapshot = snapshotFunctionSignature(
    beforeSourceText,
    entity.modulePath,
    entity,
  )
  const afterSnapshot = snapshotFunctionSignature(
    afterSourceText,
    entity.modulePath,
    entity,
  )

  if (beforeSnapshot === null || afterSnapshot === null) {
    return null
  }

  return {
    inputArity: {
      before: beforeSnapshot.inputArity,
      after: afterSnapshot.inputArity,
    },
    inputCategory: {
      before: beforeSnapshot.inputCategory,
      after: afterSnapshot.inputCategory,
    },
    optionalInputCount: {
      before: beforeSnapshot.optionalInputCount,
      after: afterSnapshot.optionalInputCount,
    },
    defaultInputCount: {
      before: beforeSnapshot.defaultInputCount,
      after: afterSnapshot.defaultInputCount,
    },
    hasOptionalInputs: {
      before: beforeSnapshot.hasOptionalInputs,
      after: afterSnapshot.hasOptionalInputs,
    },
    hasDefaultInputs: {
      before: beforeSnapshot.hasDefaultInputs,
      after: afterSnapshot.hasDefaultInputs,
    },
    asyncBehavior: {
      before: beforeSnapshot.asyncBehavior,
      after: afterSnapshot.asyncBehavior,
    },
    outputCategory: {
      before: beforeSnapshot.outputCategory,
      after: afterSnapshot.outputCategory,
    },
  }
}

function isNestedCallableBoundary(root: Node, node: Node): boolean {
  return (
    node !== root &&
    (Node.isFunctionDeclaration(node) ||
      Node.isArrowFunction(node) ||
      Node.isFunctionExpression(node) ||
      Node.isMethodDeclaration(node))
  )
}

function countScopedDescendants(
  callable: Node,
  predicate: (node: Node) => boolean,
): number {
  let count = 0

  callable.forEachDescendant((node, traversal) => {
    if (isNestedCallableBoundary(callable, node)) {
      traversal.skip()
      return
    }

    if (predicate(node)) {
      count += 1
    }
  })

  return count
}

function isBranchNode(node: Node): boolean {
  return (
    Node.isIfStatement(node) ||
    Node.isConditionalExpression(node) ||
    Node.isSwitchStatement(node) ||
    Node.isForStatement(node) ||
    Node.isForInStatement(node) ||
    Node.isForOfStatement(node) ||
    Node.isWhileStatement(node) ||
    Node.isDoStatement(node)
  )
}

function countBranches(callable: Node): number {
  return countScopedDescendants(callable, isBranchNode)
}

function countHelperCalls(callable: Node): number {
  return countScopedDescendants(
    callable,
    (node) =>
      Node.isCallExpression(node) &&
      node.getExpression().getText() !== "import",
  )
}

function hasTryCatch(callable: Node): boolean {
  return countScopedDescendants(callable, Node.isTryStatement) > 0
}

function snapshotFunctionStructure(
  moduleSourceText: string,
  modulePath: string,
  entity: CanonicalEntity,
): FunctionStructuralSnapshot | null {
  const sourceFile = createInMemorySourceFile(moduleSourceText, modulePath)
  const callable = findFunctionLikeNode(sourceFile, entity)

  if (callable === null) {
    sourceFile.forget()
    return null
  }

  const snapshot = {
    branchCount: countBranches(callable),
    helperCallCount: countHelperCalls(callable),
    hasTryCatch: hasTryCatch(callable),
  }

  sourceFile.forget()
  return snapshot
}

function getContractShape(node: Node): ContractShapeSnapshot | null {
  if (Node.isInterfaceDeclaration(node)) {
    const properties = node.getProperties()
    const methods = node.getMethods()
    const optionalPropertyCount = properties.filter((property) =>
      property.hasQuestionToken(),
    ).length
    const optionalMethodCount = methods.filter((method) =>
      method.hasQuestionToken(),
    ).length

    return {
      memberCount: properties.length + methods.length,
      optionalMemberCount: optionalPropertyCount + optionalMethodCount,
    }
  }

  if (Node.isClassDeclaration(node)) {
    const members = node.getMembers()

    return {
      memberCount: members.length,
      optionalMemberCount: members.filter((member) => {
        if (
          Node.isPropertyDeclaration(member) ||
          Node.isMethodDeclaration(member)
        ) {
          return member.hasQuestionToken()
        }

        return false
      }).length,
    }
  }

  if (Node.isEnumDeclaration(node)) {
    return {
      memberCount: node.getMembers().length,
      optionalMemberCount: 0,
    }
  }

  if (Node.isTypeAliasDeclaration(node)) {
    const typeNode = node.getTypeNode()

    if (Node.isTypeLiteral(typeNode) === false) {
      return null
    }

    const members = typeNode.getMembers()
    return {
      memberCount: members.length,
      optionalMemberCount: members.filter((member) => {
        if (
          Node.isPropertySignature(member) ||
          Node.isMethodSignature(member)
        ) {
          return member.hasQuestionToken()
        }

        return false
      }).length,
    }
  }

  return null
}

function snapshotContractShape(
  moduleSourceText: string,
  modulePath: string,
  entity: CanonicalEntity,
): ContractShapeSnapshot | null {
  const sourceFile = createInMemorySourceFile(moduleSourceText, modulePath)
  const contractNode = findContractLikeNode(sourceFile, entity)

  if (contractNode === null) {
    sourceFile.forget()
    return null
  }

  const snapshot = getContractShape(contractNode)

  sourceFile.forget()
  return snapshot
}

function resolveFunctionStructuralDelta(
  repoContext: RepoContext,
  entity: CanonicalEntity,
): FunctionStructuralDelta | null {
  const baseRef = repoContext.resolvedBaseRef
  const headRef = repoContext.resolvedHeadRef

  if (baseRef === undefined || headRef === undefined) {
    return null
  }

  const beforeSourceText = readFileAtGitRef(
    repoContext.repoRoot,
    baseRef,
    entity.modulePath,
  )
  const afterSourceText = readFileAtGitRef(
    repoContext.repoRoot,
    headRef,
    entity.modulePath,
  )

  if (beforeSourceText === null || afterSourceText === null) {
    return null
  }

  const beforeSnapshot = snapshotFunctionStructure(
    beforeSourceText,
    entity.modulePath,
    entity,
  )
  const afterSnapshot = snapshotFunctionStructure(
    afterSourceText,
    entity.modulePath,
    entity,
  )

  if (beforeSnapshot === null || afterSnapshot === null) {
    return null
  }

  return {
    branchCount: {
      before: beforeSnapshot.branchCount,
      after: afterSnapshot.branchCount,
    },
    helperCallCount: {
      before: beforeSnapshot.helperCallCount,
      after: afterSnapshot.helperCallCount,
    },
    hasTryCatch: {
      before: beforeSnapshot.hasTryCatch,
      after: afterSnapshot.hasTryCatch,
    },
  }
}

function resolveContractShapeDelta(
  repoContext: RepoContext,
  entity: CanonicalEntity,
): ContractShapeDelta | null {
  const baseRef = repoContext.resolvedBaseRef
  const headRef = repoContext.resolvedHeadRef

  if (baseRef === undefined || headRef === undefined) {
    return null
  }

  const beforeSourceText = readFileAtGitRef(
    repoContext.repoRoot,
    baseRef,
    entity.modulePath,
  )
  const afterSourceText = readFileAtGitRef(
    repoContext.repoRoot,
    headRef,
    entity.modulePath,
  )

  if (beforeSourceText === null || afterSourceText === null) {
    return null
  }

  const beforeSnapshot = snapshotContractShape(
    beforeSourceText,
    entity.modulePath,
    entity,
  )
  const afterSnapshot = snapshotContractShape(
    afterSourceText,
    entity.modulePath,
    entity,
  )

  if (beforeSnapshot === null || afterSnapshot === null) {
    return null
  }

  return {
    memberCount: {
      before: beforeSnapshot.memberCount,
      after: afterSnapshot.memberCount,
    },
    optionalMemberCount: {
      before: beforeSnapshot.optionalMemberCount,
      after: afterSnapshot.optionalMemberCount,
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

function countModuleImportFanOut(
  moduleSourceText: string,
  modulePath: string,
): number {
  const sourceFile = createInMemorySourceFile(moduleSourceText, modulePath)
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
    before: countModuleImportFanOut(beforeSourceText, modulePath),
    after: countModuleImportFanOut(afterSourceText, modulePath),
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
