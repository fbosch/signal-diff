## Why

Scheduled benchmark runs on `master` currently publish only single-run metrics. Maintainers cannot quickly spot sustained regressions or improvements across recent runs without manually downloading and comparing artifacts.

## What Changes

- Add a trend summary generator that aggregates recent scheduled benchmark artifacts.
- Emit machine-readable trend JSON and human-readable markdown in the scheduled workflow.
- Surface top sustained regressions and improvements per scenario over the recent run window.
- Document how maintainers should read and act on trend summary output.

## Capabilities

- Modified capability: `benchmark-drift-tracking`

## Impact

- Affects benchmark trend workflow steps and artifact handling.
- Adds a trend summary output contract consumed by maintainers.
- Reduces manual investigation time for long-running drift patterns.
