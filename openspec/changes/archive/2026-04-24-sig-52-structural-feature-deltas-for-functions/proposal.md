## Why

SIG-51 established Phase 3 feature/evidence extraction with module import fan-out deltas. Function-like entities still lack deterministic structural deltas, so downstream heuristics cannot yet reason about changes in branching, helper calls, or try/catch behavior.

## What Changes

- Compute `branchCount`, `helperCallCount`, and `hasTryCatch` deltas for changed function-like entities.
- Add deterministic change summaries for structural deltas.
- Preserve explicit fallback behavior when base/head callable content is unavailable.
- Add extraction tests for computed and fallback paths.

## Capabilities

- Modified capability: `canonical-review-model`

## Impact

- Extends the Phase 3 baseline from module topology into function-level structural features.
- Provides concrete structural feature data for later behavior-shift and review-priority heuristics.
