## 1. Core contract updates

- [x] 1.1 Add any missing repo-context or diff-hunk contract fields needed for resolved git input.
- [x] 1.2 Keep git implementation details out of `packages/core` exports.

## 2. Git diff ingestion

- [x] 2.1 Implement base/head resolution and changed-file inventory loading from git.
- [x] 2.2 Implement diff hunk extraction with stable file path and line-range references.
- [x] 2.3 Classify changed files into canonical kinds without breaking on non-TS files.

## 3. Validation

- [x] 3.1 Add fixture-backed tests for representative diff ingestion cases.
- [x] 3.2 Run `pnpm lint`.
- [x] 3.3 Run `pnpm test`.
- [x] 3.4 Run `pnpm typecheck`.
