## 1. Core contracts

- [ ] 1.1 Replace scaffold placeholder types in `packages/core` with canonical entity, relationship, feature, change, finding, evidence, and review surface contracts
- [ ] 1.2 Add core pipeline and interface contracts for adapters, heuristics, reporting, repo context, and diff references

## 2. Package boundary enforcement

- [ ] 2.1 Update package stubs so adapter, heuristics, reporting, and CLI depend on the new core contracts without TypeScript-specific backflow
- [ ] 2.2 Add a focused test covering the cross-package boundary and evidence-backed review surface shape

## 3. Validation

- [ ] 3.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`
- [ ] 3.2 Validate the OpenSpec change with `openspec validate sig-10-canonical-ir-boundaries`
