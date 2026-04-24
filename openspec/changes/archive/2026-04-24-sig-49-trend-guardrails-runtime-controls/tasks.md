## 1. Trend Guardrail Contract

- [x] 1.1 Add `guardrail_status` and `guardrail_messages` fields to trend summary output.
- [x] 1.2 Implement deterministic guardrail policy for runtime/control consistency.

## 2. Scheduled Workflow Signals

- [x] 2.1 Emit workflow warning when guardrail status is `warn`.
- [x] 2.2 Emit workflow failure when guardrail status is `fail`.

## 3. Tests and Docs

- [x] 3.1 Add tests for pass/warn/fail guardrail outcomes.
- [x] 3.2 Update runbook remediation guidance for guardrail warning/failure.

## 4. Validation

- [x] 4.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [x] 4.2 Run `openspec validate sig-49-trend-guardrails-runtime-controls`.
