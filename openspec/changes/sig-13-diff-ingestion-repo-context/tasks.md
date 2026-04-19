## 1. Core contract updates

- [ ] 1.1 Add any missing repo-context or diff-hunk contract fields needed for resolved git input.
- [ ] 1.2 Keep git implementation details out of `packages/core` exports.

## 2. Git diff ingestion

- [ ] 2.1 Implement base/head resolution and changed-file inventory loading from git.
- [ ] 2.2 Implement diff hunk extraction with stable file path and line-range references.
- [ ] 2.3 Classify changed files into canonical kinds without breaking on non-TS files.

## 3. Validation

- [ ] 3.1 Add fixture-backed tests for representative diff ingestion cases.
- [ ] 3.2 Run `pnpm lint`.
- [ ] 3.3 Run `pnpm test`.
- [ ] 3.4 Run `pnpm typecheck`.
