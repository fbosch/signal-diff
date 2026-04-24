## ADDED Requirements

### Requirement: Deterministic benchmark harness covers hot paths
The repository MUST provide a benchmark harness that runs deterministic scenarios for the utility's defined hot paths.

#### Scenario: benchmark command runs deterministic scenarios
- **WHEN** a maintainer runs the benchmark entrypoint locally or in CI
- **THEN** it executes the configured hot-path scenarios with deterministic fixtures and fixed run controls

#### Scenario: benchmark output includes scenario-level measurements
- **WHEN** benchmark execution completes
- **THEN** output contains per-scenario timing metrics sufficient for drift comparison

### Requirement: Benchmark result contract is versioned and comparable
Benchmark outputs MUST follow a versioned JSON contract that enables comparisons across runs.

#### Scenario: result metadata supports historical comparison
- **WHEN** a benchmark run writes results
- **THEN** the output includes schema version, commit identity, runtime metadata, and execution timestamp

#### Scenario: incompatible schema changes are detected
- **WHEN** benchmark result schema changes in a non-compatible way
- **THEN** validation fails with a clear compatibility error

### Requirement: CI enforces drift checks and trend collection
CI MUST execute benchmark automation for pull requests and scheduled default-branch runs.

#### Scenario: pull request benchmark drift check runs
- **WHEN** a pull request workflow executes
- **THEN** CI runs benchmark comparison against baseline and emits pass/warn/fail status

#### Scenario: scheduled benchmark trend run publishes artifacts
- **WHEN** the scheduled benchmark workflow runs on `master`
- **THEN** CI publishes benchmark artifacts required for trend tracking

### Requirement: Drift reporting is actionable for maintainers
The benchmark system MUST provide reporting that helps maintainers identify regressions and improvements quickly.

#### Scenario: report highlights largest drift deltas
- **WHEN** drift analysis completes
- **THEN** the report lists top regressed and improved hot paths with relative delta values

#### Scenario: maintainer docs define baseline and incident workflow
- **WHEN** a maintainer follows benchmark documentation
- **THEN** they can refresh baselines, tune thresholds, and triage noisy or failing benchmark runs
