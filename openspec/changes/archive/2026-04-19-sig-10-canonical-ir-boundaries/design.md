## Context

Phase 0 established the pnpm workspace and package scaffold, but current types are only placeholders. `docs/SPEC.md` already defines the intended product shape: a local CLI that turns a diff into a concept-first, evidence-backed review surface. This change translates that product definition into implementation contracts so later issues can build extraction, heuristics, and reporting without redefining boundaries.

The main architectural constraint is preserving a language-agnostic core while still shipping a TypeScript-first v1. That means the canonical model must express normalized programming concepts and change semantics, while TypeScript-specific extraction details stay inside `packages/adapter-typescript`.

## Goals / Non-Goals

**Goals:**
- Define stable canonical contracts for v1 entities, relationships, features, changes, findings, evidence, and review outputs.
- Define adapter, heuristic, reporting, and pipeline interfaces needed by later issues.
- Define package dependency direction and explicit no-backflow rules.
- Make the contracts concrete enough that `SIG-11`, `SIG-12`, and extraction issues can build directly on them.

**Non-Goals:**
- Implement real TypeScript extraction logic.
- Finalize all JSON field names for end-user output beyond what core contracts require.
- Implement heuristics, scoring, diff ingestion, or CLI argument parsing.
- Add backward-compatibility layers for placeholder scaffold types.

## Decisions

### 1. Canonical model lives in `packages/core`
The core package will own normalized domain types for entities, relationships, features, changes, findings, evidence, diff references, and review surfaces.

Why:
- later packages need a single source of truth
- this is the only safe place to enforce language-agnostic abstractions

Alternative considered:
- keep partial model types in each package and reconcile later
- rejected because it creates drift immediately and weakens adapter boundaries

### 2. TypeScript adapter emits canonical outputs, not TS compiler shapes
`packages/adapter-typescript` may use `ts-morph` or compiler APIs internally, but any exported interface shared with other packages must be expressed in canonical core contracts.

Why:
- preserves v3 path to other adapters
- prevents TypeScript-first implementation details from becoming architecture

Alternative considered:
- expose TS-specific intermediate types and normalize later in heuristics
- rejected because it creates backflow from adapter to core and complicates testing

### 3. Evidence is first-class, not attached ad hoc
Findings must reference structured evidence objects that can point to changed entities, feature deltas, peer anchors, companion candidates, and diff hunks.

Why:
- evidence-backed findings are a core product principle
- reporting and ranking layers both need the same evidence model

Alternative considered:
- store free-form evidence text in findings
- rejected because it weakens drill-down and validation

### 4. Review flow contracts belong in core even before rendering
Core contracts should distinguish overview, findings, evidence, and diff references so reporting packages render from a stable model rather than inventing structure later.

Why:
- concept-first presentation is part of product behavior, not only renderer behavior
- keeps JSON-first contract aligned with product flow

Alternative considered:
- leave flow structure to reporting layer only
- rejected because it would make the canonical output under-specified

### 5. Package dependency direction is strict
Allowed direction:
- `core` -> no package dependencies on feature packages
- `adapter-typescript` -> `core`
- `heuristics` -> `core`
- `reporting` -> `core`
- `cli` -> `core`, `adapter-typescript`, `heuristics`, `reporting`

Why:
- keeps orchestration in CLI and domain model in core
- makes package boundaries obvious for future work

Alternative considered:
- let heuristics and reporting depend on adapter helpers
- rejected because it couples canonical reasoning to one language implementation

## Risks / Trade-offs

- Over-modeling too early -> keep contracts only to v1-required concepts from `docs/SPEC.md`
- Naming churn before later issues land -> choose explicit v1 terminology now and refine in one place if needed
- Tension between internal IR and external JSON schema -> keep JSON-first principle, but let `SIG-11` finalize schema details against these core contracts
- TypeScript adapter may still tempt leakage -> enforce package rules in exported interfaces and tests

## Migration Plan

1. Replace scaffold placeholder types in `packages/core` with canonical contracts.
2. Update package stubs to consume new interfaces.
3. Keep smoke tests passing against the new boundary shapes.
4. Build later issues against these contracts with no compatibility shim.

## Open Questions

- Whether `render_unit`, `test_artifact`, and `example_artifact` should all be entities in core or whether some should be topology roles on entities.
- How much of priority/ranking belongs in core contracts versus heuristics package internals.
- Whether the v1 review surface should model overview aggregates directly or derive them only at reporting time.
