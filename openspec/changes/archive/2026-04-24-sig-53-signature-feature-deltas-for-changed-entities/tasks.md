## 1. Callable Signature Delta Extraction

- [x] 1.1 Compute changed function-like `inputArity` deltas from base/head callable content.
- [x] 1.2 Compute changed function-like optional/defaulted input count deltas from base/head callable content.
- [x] 1.3 Compute changed function-like async state and explicit return category deltas from base/head callable content.

## 2. Contract Shape Delta Extraction

- [x] 2.1 Compute changed interface/member shape count deltas where comparable base/head content is available.
- [x] 2.2 Compute changed optional member count deltas where comparable base/head content is available.

## 3. Change Summary and Fallbacks

- [x] 3.1 Add deterministic signature and contract-shape delta summaries to canonical changes.
- [x] 3.2 Preserve explicit fallback summaries when comparable signature or contract-shape content is unavailable.

## 4. Tests

- [x] 4.1 Add computed callable signature delta fixture coverage.
- [x] 4.2 Add computed contract-shape delta fixture coverage.
- [x] 4.3 Add fallback coverage for added callable and contract-like entities.

## 5. Validation

- [x] 5.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [x] 5.2 Run `openspec validate sig-53-signature-feature-deltas-for-changed-entities`.
