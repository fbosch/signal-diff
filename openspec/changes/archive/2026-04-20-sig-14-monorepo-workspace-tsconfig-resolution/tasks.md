## 1. Repository workspace discovery

- [x] 1.1 Implement package-manager-agnostic workspace/package discovery from repository files.
- [x] 1.2 Normalize discovered workspace/package topology into repository context contracts.

## 2. Tsconfig and project reference resolution

- [x] 2.1 Discover relevant tsconfig files for changed files and workspace packages.
- [x] 2.2 Resolve project references transitively and preserve deterministic ordering.
- [x] 2.3 Extract and normalize path alias metadata for downstream adapter consumption.

## 3. Validation

- [x] 3.1 Add fixture-backed tests for monorepo references and path aliases.
- [x] 3.2 Add tests proving behavior does not depend on pnpm-specific workspace metadata.
- [x] 3.3 Run `pnpm lint`.
- [x] 3.4 Run `pnpm test`.
- [x] 3.5 Run `pnpm typecheck`.
- [x] 3.6 Run `openspec validate sig-14-monorepo-workspace-tsconfig-resolution`.
