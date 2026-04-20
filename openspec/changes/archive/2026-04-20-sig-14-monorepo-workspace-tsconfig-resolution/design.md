# Design: Monorepo workspace and tsconfig resolution

## Context

`signal-diff` needs deterministic repository context for TypeScript monorepos so adapters can reason about changed files with workspace and tsconfig metadata.

## Decisions

1. **Workspace discovery from repository files**
   - Discover workspace package roots from `pnpm-workspace.yaml` and `package.json` workspaces.
   - Normalize workspace roots to repo-relative form and keep deterministic ordering.

2. **Project graph discovery from tsconfig files**
   - Start from repo/workspace `tsconfig.json` files and traverse project references transitively.
   - Exclude missing references to avoid false graph edges.

3. **TypeScript-native tsconfig parsing**
   - Parse configs via TypeScript config APIs instead of ad-hoc JSON parsing.
   - This keeps behavior aligned with TypeScript for JSONC and `extends` resolution semantics.

4. **Per-project alias scoping**
   - Store `baseUrl` and `pathAliases` on each discovered `TsconfigProject`.
   - Do not merge aliases into one global map; conflicting aliases across packages remain unambiguous.

## Data model impact

- `RepoContext.tsconfigProjects` contains project-local metadata:
  - `configPath`
  - `references`
  - optional `baseUrl`
  - optional `pathAliases`

## Determinism and safety

- Normalize all paths to repo-relative form.
- De-duplicate and sort workspace roots, references, projects, and alias targets.
- Ignore invalid or missing config inputs conservatively.

## Validation

- Added/updated fixture-backed tests for:
  - workspace discovery without pnpm-only assumptions
  - recursive and absolute workspace roots
  - transitive reference discovery and missing-reference exclusion
  - tsconfig alias inheritance through `extends`
  - JSONC and package-based tsconfig `extends`
  - scoped handling of conflicting aliases across projects
