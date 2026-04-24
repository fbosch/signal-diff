## 1. Feature Delta Baseline

- [x] 1.1 Implement deterministic module feature delta extraction for `topology.importFanOut`.
- [x] 1.2 Populate canonical change summaries from extracted pre/post delta values.

## 2. Evidence Wiring

- [x] 2.1 Attach structured evidence references for extracted feature-delta context.
- [x] 2.2 Ensure evidence notes remain deterministic across repeated runs.

## 3. Tests

- [x] 3.1 Add fixture test covering module import fan-out delta across base/head refs.
- [x] 3.2 Add regression test for missing pre/post source fallback behavior.

## 4. Validation

- [x] 4.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [x] 4.2 Run `openspec validate sig-51-feature-evidence-extraction-baseline`.
