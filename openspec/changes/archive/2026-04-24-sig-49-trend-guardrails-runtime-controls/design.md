## Context

Trend summaries currently report runtime and control coverage but do not provide an explicit status policy. This leaves interpretation to maintainers and allows incompatible windows to appear equivalent to valid windows.

## Goals

- Produce deterministic guardrail status for every trend summary.
- Fail scheduled trend runs when controls signatures diverge.
- Warn (not fail) when runtime signatures diverge while controls remain consistent.
- Keep guardrail reasoning embedded in JSON and markdown outputs.

## Non-Goals

- Automatic baseline or control mutation.
- Statistical normalization across different runtimes.

## Decisions

1. Add `guardrail_status` and `guardrail_messages` to trend summary contract.
2. Guardrail policy: `fail` for controls mismatch; `warn` for runtime mismatch with consistent controls; otherwise `pass`.
3. Workflow step emits warning on `warn` and exits non-zero on `fail`.
4. Runbook documents remediation for both warning and failure modes.

## Risks And Trade-Offs

- Stricter fail behavior can temporarily increase scheduled workflow failures until controls are stabilized.
- Runtime warning may still generate noisy alerts, but avoids false confidence in cross-runtime trend deltas.

## Migration Plan

1. Extend trend summary generator and markdown rendering with guardrail fields.
2. Add workflow signal step driven by summary guardrail status.
3. Add tests and documentation.
