# developer-gated-workflow Specification

## Purpose
TBD - created by archiving change sig-40-no-mistakes-worktrunk-gate. Update Purpose after archive.
## Requirements
### Requirement: Repository defines no-mistakes baseline commands
The repository MUST define a shared `no-mistakes` repo configuration with explicit baseline command behavior.

#### Scenario: gate test phase runs repository baseline
- **WHEN** a contributor pushes through `no-mistakes`
- **THEN** the gate executes the repository-configured test command including required type checking

#### Scenario: gate lint phase is deterministic
- **WHEN** a contributor pushes through `no-mistakes`
- **THEN** the gate executes the repository-configured lint command instead of agent auto-detection

### Requirement: Worktrunk project config provides gated push workflow
The repository MUST define Worktrunk project configuration that supports no-mistakes gated pushes.

#### Scenario: contributor can run gated push from Worktrunk alias
- **WHEN** a contributor runs the gated push alias from a feature worktree
- **THEN** Worktrunk runs `git push no-mistakes` for the active branch

#### Scenario: contributor can run step commit plus gated push
- **WHEN** a contributor runs the combined Worktrunk alias
- **THEN** Worktrunk executes `wt step commit` and then pushes the branch to `no-mistakes`

### Requirement: Worktrunk pre-merge checks match repository baseline
The repository MUST define a Worktrunk pre-merge hook that runs the baseline checks before merge operations.

#### Scenario: pre-merge validation runs lint, test, and typecheck
- **WHEN** a contributor runs `wt merge`
- **THEN** Worktrunk executes lint, test, and typecheck commands and aborts merge on failure

