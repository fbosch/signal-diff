## MODIFIED Requirements

### Requirement: CI enforces drift checks and trend collection
CI MUST execute benchmark automation for pull requests and scheduled default-branch runs.

#### Scenario: scheduled trend run fails on controls mismatch
- **WHEN** trend aggregation detects multiple control signatures in the configured window
- **THEN** CI emits an explicit failure signal and exits non-zero for the scheduled trend workflow

### Requirement: Drift reporting is actionable for maintainers
The benchmark system MUST provide reporting that helps maintainers identify regressions and improvements quickly.

#### Scenario: trend summary reports guardrail status and rationale
- **WHEN** trend summary generation completes
- **THEN** the machine-readable summary includes deterministic guardrail status and explanatory messages for runtime/control consistency

#### Scenario: trend summary warns on runtime mismatch
- **WHEN** trend aggregation detects runtime signature divergence with consistent controls
- **THEN** CI emits a warning signal while preserving trend output artifacts
