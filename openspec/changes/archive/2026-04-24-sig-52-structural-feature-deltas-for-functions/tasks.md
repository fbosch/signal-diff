## 1. Structural Delta Extraction

- [x] 1.1 Compute function-like `branchCount` deltas from base/head callable content.
- [x] 1.2 Compute function-like `helperCallCount` deltas from base/head callable content.
- [x] 1.3 Compute function-like `hasTryCatch` deltas from base/head callable content.

## 2. Change Summary and Fallbacks

- [x] 2.1 Add deterministic structural delta summaries to canonical changes.
- [x] 2.2 Preserve explicit fallback summaries when comparable callable content is unavailable.

## 3. Tests

- [x] 3.1 Add computed structural delta fixture coverage for changed functions.
- [x] 3.2 Add fallback coverage for added function-like entities.

## 4. Validation

- [x] 4.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [x] 4.2 Run `openspec validate sig-52-structural-feature-deltas-for-functions`.
