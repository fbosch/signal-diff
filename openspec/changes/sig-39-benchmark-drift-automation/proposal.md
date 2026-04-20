## Why

`signal-diff` has no repeatable benchmark workflow for hot paths, so performance regressions can land without visibility and drift cannot be tracked over time.

## What Changes

- Add a benchmark harness with deterministic fixtures for the utility's highest-cost paths.
- Define a versioned benchmark result contract with environment and commit metadata.
- Automate benchmark runs in CI for pull requests and scheduled default-branch trend collection.
- Add explicit drift thresholds and reporting outputs for maintainers.
- Document benchmark operations, baseline refresh policy, and troubleshooting.

## Capabilities

- New capability: `benchmark-drift-tracking`

## Impact

- Affects benchmark fixtures/scripts, CI workflows, JSON reporting contracts, and maintainer docs.
- Introduces a measurable performance gate for hot paths while preserving deterministic, auditable history.
