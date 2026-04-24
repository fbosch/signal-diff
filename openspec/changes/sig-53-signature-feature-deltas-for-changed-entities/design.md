## Context

The TypeScript adapter already extracts stable entities plus deterministic module topology and function structural deltas. The next Phase 3 slice should add a narrow signature feature set without introducing heuristic findings yet.

## Goals / Non-Goals

**Goals:**

- Extract deterministic pre/post signature deltas for changed function-like entities.
- Cover input arity, optional/defaulted input count, async/sync state, and explicit return category where practical.
- Extract deterministic contract-shape deltas for changed contract/type-like entities where practical.
- Keep fallback behavior explicit when comparable base/head signature content is unavailable.
- Add focused test coverage for computed and fallback behavior.

**Non-Goals:**

- Full semantic type compatibility analysis.
- Consumer impact analysis or public contract drift findings.
- Peer comparison, companion inference, or heuristic ranking changes.
- Migration or compatibility shims for older report shapes.

## Decisions

1. Use ts-morph AST parsing on base/head source text to compute signature snapshots.
   - Rationale: existing Phase 3 extraction already uses ts-morph for source snapshots, keeping this slice deterministic and avoiding regex parsing.
   - Alternative considered: derive deltas from diff hunks only. Rejected because hunks do not reliably identify full callable or contract shape.

2. Reuse existing entity kind/name matching for this slice.
   - Rationale: current canonical entities already use stable names and kinds, and SIG-52 proved this path for callable structural snapshots.
   - Alternative considered: add a new identity-key lookup system. Deferred until there is a concrete mismatch that requires it.

3. Represent callable return category as a small normalized string derived from explicit return annotation where present.
   - Rationale: explicit annotations are deterministic and useful for contract drift signals.
   - Alternative considered: infer checker return types. Deferred because it adds semantic complexity and may require project-level type checking for source snapshots.

4. Treat missing base/head source or missing matched entity as explicit fallback, not zero-change.
   - Rationale: zero-change would hide extraction limitations and mislead later heuristics.

## Risks / Trade-offs

- Name-based matching can be ambiguous for overloads or duplicate local declarations -> prefer implementation/body nodes where applicable and keep fallback behavior explicit.
- Explicit return annotations miss inferred return-shape changes -> acceptable for this slice because deterministic, cheap extraction is the goal.
- Contract-shape deltas can be broad for complex type aliases -> start with interface/type literal/class member counts where practical and avoid pretending unsupported shapes are complete.
