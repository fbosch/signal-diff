import type {
  CanonicalEntity,
  CanonicalEntityKind,
  ChangedFileKind,
  EntityChange,
  ExtractionAdapter,
  ExtractionResult,
  PublicRole,
  ReviewRequest,
} from "@signal-diff/core"
import { createEmptyCanonicalFeatures } from "@signal-diff/core"

export interface TypeScriptAdapterInput {
  filePath: string
  kind: ChangedFileKind
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
      : request.repoContext.changedFiles.map((changedFile) => ({
          filePath: changedFile.path,
          baseStartLine: 1,
          baseLineCount: 1,
          headStartLine: 1,
          headLineCount: 1,
        }))

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
