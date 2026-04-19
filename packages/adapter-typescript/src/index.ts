import type { CanonicalEntity } from "@signal-diff/core"

export interface TypeScriptAdapterInput {
  filePath: string
}

export function createTypeScriptStubEntity(
  input: TypeScriptAdapterInput,
): CanonicalEntity {
  return {
    id: `ts:${input.filePath}`,
    kind: "module",
    name: input.filePath,
    path: input.filePath,
  }
}
