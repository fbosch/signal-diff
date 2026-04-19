import type {
  CanonicalEntity,
  EntityChange,
  ExtractionAdapter,
  ExtractionResult,
  ReviewRequest,
} from "@signal-diff/core"
import { createEmptyCanonicalFeatures } from "@signal-diff/core"

export interface TypeScriptAdapterInput {
  filePath: string
}

export function createTypeScriptStubEntity(
  input: TypeScriptAdapterInput,
): CanonicalEntity {
  return {
    id: `ts:${input.filePath}#module`,
    kind: "module",
    name: input.filePath,
    modulePath: input.filePath,
    exported: true,
    location: {
      filePath: input.filePath,
      startLine: 1,
      endLine: 1,
    },
    features: createEmptyCanonicalFeatures(input.filePath),
  }
}

export function createTypeScriptStubChange(
  entity: CanonicalEntity,
): EntityChange {
  return {
    id: `change:${entity.id}`,
    entityId: entity.id,
    kind: "entity_modified",
    summary: `Detected a changed module at ${entity.modulePath}.`,
    featureDeltas: {
      summary: ["Changed module detected from diff scope."],
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
    createTypeScriptStubEntity({ filePath: changedFile.path }),
  )

  return {
    repoContext: request.repoContext,
    entities,
    relationships: [],
    changes: entities.map((entity) => createTypeScriptStubChange(entity)),
    diffReferences: request.repoContext.changedFiles.map((changedFile) => ({
      filePath: changedFile.path,
      baseStartLine: 1,
      baseLineCount: 1,
      headStartLine: 1,
      headLineCount: 1,
    })),
  }
}

export const typeScriptExtractionAdapter: ExtractionAdapter = {
  language: "typescript",
  extract(request: ReviewRequest): ExtractionResult {
    return createTypeScriptStubExtractionResult(request)
  },
}
