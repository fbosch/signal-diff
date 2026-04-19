## 1. JSON contract

- [x] 1.1 Define reporting-specific v1 JSON types for summary, changed entities, findings, evidence, and diff references
- [x] 1.2 Add serializer helpers that project `ReviewSurface` into the v1 JSON report contract

## 2. Validation boundary

- [x] 2.1 Add a lightweight validation/assertion boundary for the serialized JSON contract
- [x] 2.2 Update reporting and CLI smoke tests to assert the public JSON contract rather than raw internal core structure alone

## 3. Validation

- [x] 3.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`
- [x] 3.2 Validate the OpenSpec change with `openspec validate sig-11-json-reporting-contracts`
