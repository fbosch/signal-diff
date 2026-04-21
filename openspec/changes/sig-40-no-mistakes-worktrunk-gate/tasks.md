## 1. no-mistakes repo configuration

- [ ] 1.1 Add `.no-mistakes.yaml` at repo root.
- [ ] 1.2 Configure explicit baseline commands for lint and test/typecheck.

## 2. Worktrunk integration

- [ ] 2.1 Add `.config/wt.toml` project configuration.
- [ ] 2.2 Add pre-merge validation hook for `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [ ] 2.3 Add aliases for gated push and `wt step` + gated push flow.

## 3. Validation

- [ ] 3.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [ ] 3.2 Run `openspec validate sig-40-no-mistakes-worktrunk-gate`.
