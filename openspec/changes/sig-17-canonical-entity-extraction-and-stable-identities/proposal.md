## Why

The TypeScript adapter currently emits stub entities from changed file paths and does not map real source constructs into canonical entities. Phase 2 needs real canonical entity extraction with stable identifiers so downstream relationship extraction and heuristics can reason over semantic structures.

## What Changes

- Add canonical entity extraction from TypeScript source files loaded through the monorepo ts-morph loader.
- Map top-level TypeScript constructs and key class members into canonical entity kinds required by v1 contracts.
- Introduce stable entity identifier generation based on semantic scope names and module paths.
- Add fixture-backed tests that verify canonical kind coverage and ID stability across semantic-preserving edits.

## Capabilities

- New capability: `typescript-canonical-entity-extraction`

## Impact

- Affects `@signal-diff/adapter-typescript` extraction behavior for changed TypeScript source files.
- Preserves language-agnostic core contracts while replacing source-file stubs with semantic entities.
