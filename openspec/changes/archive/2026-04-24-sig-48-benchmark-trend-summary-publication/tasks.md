## 1. Trend Summary Contract

- [x] 1.1 Define machine-readable trend summary schema for recent scheduled runs.
- [x] 1.2 Add trend ranking logic for sustained regressions and improvements.

## 2. Trend Aggregation Implementation

- [x] 2.1 Implement benchmark trend summary generator in `benchmarks/`.
- [x] 2.2 Add markdown rendering from trend summary contract.

## 3. Scheduled Workflow Integration

- [x] 3.1 Fetch recent scheduled trend artifacts in `benchmark-trend.yml`.
- [x] 3.2 Generate and publish trend summary markdown and JSON artifacts.
- [x] 3.3 Emit explicit warnings when trend window is incomplete.

## 4. Documentation

- [x] 4.1 Update benchmark runbook with trend summary interpretation guidance.
- [x] 4.2 Document troubleshooting steps for missing/partial trend history.

## 5. Validation

- [x] 5.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [x] 5.2 Run `openspec validate sig-48-benchmark-trend-summary-publication`.
