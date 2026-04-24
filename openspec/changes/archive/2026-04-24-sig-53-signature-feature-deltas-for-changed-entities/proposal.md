## Why

SIG-51 and SIG-52 established deterministic Phase 3 topology and structural deltas. Changed entities still lack signature-level deltas, so downstream public contract drift and behavior-shift heuristics cannot yet reason over callable inputs, async/sync changes, return categories, or contract member shape.

## What Changes

- Compute signature deltas for changed function-like entities, including input arity, optional/defaulted input count, async/sync state, and explicit return category where practical.
- Compute simple contract shape deltas for changed contract/type-like entities, including member count and optional member count where practical.
- Add deterministic change summaries for signature/shape deltas.
- Preserve explicit fallback behavior when comparable base/head signature content is unavailable.
- Add extraction tests for computed and fallback paths.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `canonical-review-model`: Extend Phase 3 feature-delta requirements to cover signature and contract-shape deltas for changed entities.

## Impact

- Extends the TypeScript adapter's feature-delta extraction.
- Adds canonical change output for signature and contract-shape signals already represented by the core model.
- Provides concrete feature data for later public contract drift, behavior-shift, and review-priority heuristics.
