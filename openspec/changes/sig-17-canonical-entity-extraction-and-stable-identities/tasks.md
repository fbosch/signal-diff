## 1. Canonical entity extraction

- [x] 1.1 Extract canonical module entities from changed TypeScript source files.
- [x] 1.2 Extract canonical function, render-unit, contract, and type-like entities from TypeScript source constructs.
- [x] 1.3 Extract canonical class member entities for methods and fields.

## 2. Stable identity strategy

- [x] 2.1 Generate deterministic canonical entity IDs from module paths and semantic scope names.
- [x] 2.2 Ensure identity stability across semantic-preserving source edits.

## 3. Adapter integration

- [x] 3.1 Use the ts-morph monorepo loader to extract source-backed canonical entities for changed TypeScript source files.
- [x] 3.2 Keep non-source changed-file handling compatible with canonical contracts.

## 4. Validation

- [x] 4.1 Add fixture-backed tests for canonical entity kind coverage.
- [x] 4.2 Add fixture-backed tests for stable entity IDs across semantic-preserving edits.
- [x] 4.3 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [x] 4.4 Run `openspec validate sig-17-canonical-entity-extraction-and-stable-identities`.
