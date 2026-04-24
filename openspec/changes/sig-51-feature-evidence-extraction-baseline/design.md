## Context

`packages/core` already defines canonical feature families and evidence models, but adapter output currently uses mostly stub feature deltas. This blocks meaningful heuristics from leveraging pre/post feature changes.

## Goals

- Deliver one deterministic extraction vertical slice for feature deltas.
- Include structured evidence references that point to changed entities and feature-delta context.
- Keep implementation small, testable, and aligned with existing contracts.

## Non-Goals

- Full multi-entity feature extraction coverage in one change.
- New heuristic categories beyond wiring proof for extracted deltas.

## Decisions

1. Start with module-level topology delta (`importFanOut`) as the first deterministic baseline.
2. Compute pre/post values from base/head file contents where available.
3. Keep fallback behavior explicit when pre/post cannot be computed (no silent defaults).
4. Reuse existing `ReviewEvidence` structure and include supporting notes tied to extracted delta behavior.

## Risks And Trade-Offs

- Delta quality depends on ref/file availability in local/git contexts.
- Single-feature baseline may look narrow, but minimizes risk while proving Phase 3 pipeline.

## Migration Plan

1. Implement module feature-delta extraction in TypeScript adapter change generation.
2. Add tests for deterministic before/after extraction behavior.
3. Validate output shape and evidence linkage through existing pipeline tests.
