## Context

`docs/SPEC.md` defines Phase 1 as starting with git diff ingestion, changed file parsing, and diff hunk references. The current code still builds `ReviewRequest.repoContext` from hardcoded stub data in `packages/cli`, so there is no real path from a repository diff into the canonical review pipeline.

## Goals

- resolve explicit base and head refs for a local git repository
- produce a stable changed-file inventory from git diff
- extract diff hunk references that can be attached to findings and reports later
- keep the git integration boundary outside `packages/core`

## Non-Goals

- entity extraction from source files
- monorepo workspace discovery and tsconfig resolution
- advanced rename/copy heuristics beyond what git diff already reports
- markdown rendering changes

## Decisions

1. Git diff loading lives in `packages/cli`, not `packages/core`.
2. `packages/core` owns the canonical repo-context and diff-reference contracts only.
3. Diff ingestion resolves explicit `baseRef` and `headRef` and fails loudly when refs cannot be resolved.
4. Changed files are classified into canonical `ChangedFileKind` values using deterministic path heuristics so non-TypeScript files do not break the pipeline.
5. Diff hunk references keep only stable line-range data needed by later evidence linking.

## Risks And Trade-Offs

- File-kind classification will start heuristic and may need refinement once monorepos and framework-specific conventions are added.
- Git patch parsing can become brittle if overdesigned too early, so the first version should cover standard unified diff hunks only.
- Keeping the git boundary in `packages/cli` avoids core leakage but means later shared repo-loading helpers may need extraction once a second consumer exists.

## Migration Plan

1. Add core types needed for resolved repo context and diff hunk references.
2. Add CLI-side git diff loading helpers and a request builder from repo refs.
3. Replace stub-only request construction in tests with fixture-backed git repos where useful.
4. Keep existing stub review-surface helpers for narrow unit tests where direct request injection is still useful.
