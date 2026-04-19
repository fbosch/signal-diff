# ci-and-release-automation Specification

## Purpose
TBD - created by archiving change sig-38-ci-release-automation. Update Purpose after archive.
## Requirements
### Requirement: Repository validation runs in GitHub Actions
The repository MUST run its baseline validation steps in GitHub Actions for pull requests and pushes to `master`.

#### Scenario: pull requests run baseline validation
- **WHEN** a pull request is opened, synchronized, reopened, or marked ready for review
- **THEN** GitHub Actions runs the repository baseline checks for linting, typechecking, tests, and build readiness

#### Scenario: pushes to master run baseline validation
- **WHEN** changes are pushed to `master`
- **THEN** GitHub Actions runs the same baseline validation workflow

### Requirement: Preview and publish policy is explicit
The repository MUST make preview and publish policy explicit rather than silently guessing whether npm distribution is enabled.

#### Scenario: preview workflow is gated until package contract approval
- **WHEN** the preview workflow runs before the public CLI install contract is approved
- **THEN** it exits with a clear message that preview publication is intentionally disabled

#### Scenario: docs describe current distribution gate
- **WHEN** a maintainer reads the repository docs
- **THEN** they can see that preview and npm publish remain gated until the package name, bin entry, and install contract are approved

### Requirement: Release Please flow is prepared before npm publish is enabled
The repository MUST support Release Please PR preparation on `master` without requiring npm publication to be active yet.

#### Scenario: release workflow prepares versioning state
- **WHEN** changes are pushed to `master`
- **THEN** the release workflow can open or update a Release Please PR using checked-in config and manifest files

#### Scenario: publish remains explicitly disabled
- **WHEN** Release Please runs while npm publication is gated
- **THEN** no npm publish step executes implicitly

