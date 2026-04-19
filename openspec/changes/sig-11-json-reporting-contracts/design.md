## Context

`docs/SPEC.md` makes JSON the canonical output contract for v1 and treats markdown as a rendering of that contract. After `SIG-10`, the repo has a canonical internal review surface, but `packages/reporting` still only does `JSON.stringify(reviewSurface)`. That directly exposes internal types instead of a stable v1 report schema.

`SIG-11` closes that gap by defining the first explicit analyzer output contract. The goal is not to replace the internal IR, but to project it into a stable external report shape with a clear validation boundary.

## Goals / Non-Goals

**Goals:**
- Define a stable v1 JSON report shape for summary, changed entities, findings, evidence, and diff references.
- Keep the internal core review surface separate from the exported JSON contract.
- Add typed serializer and validation helpers in `packages/reporting`.
- Make the JSON contract concrete enough that `SIG-12` can build golden tests directly on it.

**Non-Goals:**
- Implement markdown rendering.
- Add third-party schema libraries or new dependencies.
- Finalize all CLI flags or transport concerns.
- Add backward-compatibility layers for pre-schema output.

## Decisions

### 1. JSON contract lives in `packages/reporting`
The user-facing v1 JSON schema belongs in `packages/reporting`, not `packages/core`.

Why:
- `packages/core` should keep canonical internal contracts, not renderer-specific field groupings
- the JSON contract is an external projection used by CLI and future markdown rendering

Alternative considered:
- define JSON field layout directly in `packages/core`
- rejected because it mixes canonical IR with external presentation contract

### 2. Report schema uses explicit sections, not raw IR names
The JSON report will expose sections such as `summary`, `changed_entities`, `findings`, `evidence`, and `diff_references` rather than just dumping `ReviewSurface`.

Why:
- matches the accepted issue deliverables and v1 UX flow
- keeps external naming stable even if internal IR evolves

Alternative considered:
- export `ReviewSurface` as-is
- rejected because it makes internal refactors a breaking external change

### 3. Serialized findings reference evidence by ID
The JSON report will keep evidence as its own collection, with findings referencing evidence IDs instead of embedding evidence records inline.

Why:
- preserves the evidence-first modeling introduced in `SIG-10`
- keeps external contract aligned with the internal drill-down structure

### 4. Validation boundary stays local and explicit
`packages/reporting` will expose a lightweight validator/assertion for the serialized report shape without adding runtime schema dependencies yet.

Why:
- enough discipline for current repo stage
- avoids pulling in extra dependencies before real data volume or external integrations exist

## Risks / Trade-offs

- External schema may still evolve in Phase 0 -> use explicit `schema_version` field and keep contract v1-scoped
- Internal/external duplication -> keep projection logic centralized in `packages/reporting`
- Over-designing before real extraction -> only cover fields already justified by `docs/SPEC.md` and `SIG-11`

## Migration Plan

1. Add reporting-specific JSON types and serializer functions.
2. Keep `ReviewSurface` as internal canonical data.
3. Update CLI/reporting tests to assert serialized v1 JSON shape instead of raw `ReviewSurface`.
4. Use this contract as the source of truth for later golden fixtures and markdown rendering.

## Open Questions

- Whether future markdown rendering should consume the fully serialized JSON object or an intermediate reporting projection right before serialization.
- Whether `summary.top_findings` should stay as IDs only or later expand to compact finding preview objects.
