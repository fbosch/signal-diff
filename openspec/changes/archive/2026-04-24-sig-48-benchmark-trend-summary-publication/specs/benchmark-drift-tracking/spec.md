## MODIFIED Requirements

### Requirement: CI enforces drift checks and trend collection
CI MUST execute benchmark automation for pull requests and scheduled default-branch runs.

#### Scenario: scheduled benchmark trend run publishes cross-run summaries
- **WHEN** the scheduled benchmark workflow runs on `master`
- **THEN** CI aggregates recent scheduled benchmark results and publishes machine-readable and human-readable trend summary artifacts

### Requirement: Drift reporting is actionable for maintainers
The benchmark system MUST provide reporting that helps maintainers identify regressions and improvements quickly.

#### Scenario: trend summary highlights sustained drift across recent runs
- **WHEN** benchmark trend aggregation completes
- **THEN** the report identifies top sustained regressions and improvements across the configured recent run window and includes effective sample size metadata
