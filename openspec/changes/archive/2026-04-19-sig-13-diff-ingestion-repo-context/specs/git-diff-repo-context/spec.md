## ADDED Requirements

### Requirement: Review requests can be built from explicit git refs
The system MUST load review input from a local git repository using explicit base and head refs so later analysis can reference a real diff instead of stub-only context.

#### Scenario: base and head refs are resolved for diff loading
- **WHEN** the pipeline is asked to analyze a local repository
- **THEN** it resolves explicit `baseRef` and `headRef` inputs before diff loading
- **AND** it fails loudly if either ref cannot be resolved

### Requirement: Changed-file inventory is derived from git diff
The system MUST derive changed files from git diff output and classify them into canonical changed-file kinds without breaking on non-TypeScript files.

#### Scenario: changed files are classified deterministically
- **WHEN** a diff includes source, test, documentation, or configuration files
- **THEN** the repo context includes those changed file paths
- **AND** each changed file has a canonical `ChangedFileKind` classification

### Requirement: Diff hunk references are stable enough for evidence linking
The system MUST extract diff hunk references with stable file and line-range information so findings and reports can later point to exact changed regions.

#### Scenario: unified diff hunks become canonical references
- **WHEN** a changed file contains one or more unified diff hunks
- **THEN** the pipeline stores canonical diff hunk references with file path, base start line, base line count, head start line, and head line count
- **AND** those references are available to later pipeline stages through the review request or extraction result path
