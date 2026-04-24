## Context

The TypeScript adapter already extracts stable function-like entities and module import fan-out deltas. The next Phase 3 slice should add a small structural feature set for changed functions without expanding the heuristic layer yet.

## Goals

- Extract deterministic pre/post structural deltas for changed function-like entities.
- Cover `branchCount`, `helperCallCount`, and `hasTryCatch`.
- Keep fallback behavior explicit when comparable callable content is unavailable.
- Add focused test coverage for computed and fallback behavior.

## Non-Goals

- Full semantic behavior analysis.
- Peer comparison or heuristic ranking changes.
- Structural deltas for every entity kind.

## Decisions

1. Use ts-morph AST traversal on base/head source text to avoid regex parsing of code structure.
2. Match callable nodes by existing canonical entity kind/name within the module.
3. Treat missing base/head file or missing callable as explicit fallback, not zero-change.
4. Count helper calls as non-dynamic-import call expressions inside the callable.

## Risks And Trade-Offs

- Name-based callable matching is sufficient for this slice but may need identity-key matching later.
- Helper-call count is intentionally broad; later slices can refine call categories.

## Migration Plan

1. Add structural snapshot/delta helpers to the TypeScript adapter.
2. Attach deltas to existing canonical `EntityChange` objects.
3. Add fixture tests and run standard validation.
