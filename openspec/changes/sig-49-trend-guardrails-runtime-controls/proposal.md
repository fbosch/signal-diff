## Why

Scheduled trend summaries can aggregate runs with incompatible benchmark controls or heterogeneous runtimes. Without explicit guardrails, maintainers may interpret non-comparable trend deltas as signal.

## What Changes

- Add deterministic guardrail classification (`pass`, `warn`, `fail`) to benchmark trend summaries.
- Define fail-loud behavior when trend windows mix benchmark controls.
- Emit explicit workflow warning/error signals based on guardrail status.
- Document remediation guidance for runtime and controls mismatches.

## Capabilities

- Modified capability: `benchmark-drift-tracking`

## Impact

- Affects trend summary contract and scheduled trend workflow behavior.
- Improves maintainers' ability to trust or reject trend windows quickly.
