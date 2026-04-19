## Why

`signal-diff` needs a stable canonical model before any real extraction, heuristic, or reporting work starts. Without explicit IR and interface boundaries now, later TypeScript-first implementation work will leak language-specific shapes into the core and make multi-language expansion harder.

## What Changes

- Define the canonical v1 review model for entities, relationships, normalized features, changes, findings, evidence, and review outputs.
- Define the core interfaces between repository context, adapters, heuristics, reporting, and CLI layers.
- Establish package dependency rules so adapters depend on core contracts but core never depends on language-specific implementations.
- Establish invariants for evidence-backed findings and concept-first review flow.

## Capabilities

### New Capabilities
- `canonical-review-model`: Defines the canonical IR, evidence model, review surface contracts, and package-boundary invariants for v1.

### Modified Capabilities
- None.

## Impact

- Affects `packages/core`, `packages/adapter-typescript`, `packages/heuristics`, `packages/reporting`, and `packages/cli`
- Establishes the contract used by later issues for JSON schema, extraction, heuristics, and rendering
- No external API or runtime dependency change yet
