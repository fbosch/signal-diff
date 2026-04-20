## Why

Diff ingestion now resolves base/head and changed files, but repository loading still lacks a canonical monorepo workspace and tsconfig discovery pass. Without that pass, later TypeScript extraction cannot reliably load projects across package boundaries, project references, or path aliases.

## What Changes

- add repository workspace discovery that is package-manager agnostic and does not assume pnpm
- add tsconfig discovery and resolution for root and package-level configs, including project references
- add path-alias resolution metadata that can be reused by later adapter phases without duplicate logic
- add fixture-backed tests for monorepo workspace and tsconfig resolution edge cases

## Capabilities

- Modified capability: `git-diff-repo-context`

## Impact

- Affected packages: `packages/core`, `packages/cli`, `tests`, `fixtures`
- Affected behavior: repository context now includes reusable workspace and tsconfig topology for downstream adapter loading
- This extends the pipeline input contract needed by `SIG-16` and `SIG-15`
