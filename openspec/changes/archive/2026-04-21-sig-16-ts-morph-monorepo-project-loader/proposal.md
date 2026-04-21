## Why

The current TypeScript adapter is a stub and does not load real TypeScript projects or source files from repository context. Phase 2 needs a deterministic loader so extraction can operate on real compiler context across monorepos.

## What Changes

- Add a ts-morph project loader that builds `Project` instances from repository `tsconfigProjects` metadata.
- Add changed-file and adjacent-file loading behavior suitable for downstream contract and companion analysis.
- Add adapter-facing loader API and typed loader result metadata for reuse in later extraction tasks.
- Add fixture-backed tests for monorepo loading and fail-loud error paths.

## Capabilities

- New capability: `typescript-monorepo-project-loader`

## Impact

- Affects `@signal-diff/adapter-typescript` internals and tests.
- Adds `ts-morph` dependency scoped to the TypeScript adapter package.
- Does not change core package contracts.
