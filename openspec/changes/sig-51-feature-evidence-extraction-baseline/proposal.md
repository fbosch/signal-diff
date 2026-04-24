## Why

Phase 3 (feature and evidence extraction) is still at 0% in project milestones. Core contracts exist, but there is no deterministic end-to-end slice that extracts feature deltas and structured evidence for changed entities.

## What Changes

- Add a minimal deterministic feature-delta extraction path for one core entity class.
- Emit structured evidence references tied to extracted feature deltas.
- Add fixture and contract tests for the new extraction behavior.
- Keep changes language-adapter side while preserving framework-neutral `packages/core` contracts.

## Capabilities

- Modified capability: `canonical-review-model`

## Impact

- Improves signal quality for downstream heuristics by providing concrete feature delta inputs.
- Establishes the first reusable Phase 3 baseline for evidence-backed extraction.
