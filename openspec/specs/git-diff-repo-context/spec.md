# git-diff-repo-context Specification

## Purpose
TBD - created by archiving change sig-13-diff-ingestion-repo-context. Update Purpose after archive.
## Requirements
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

### Requirement: Repository context includes package-manager-agnostic workspace topology
The system MUST discover monorepo workspace/package structure without assuming a specific package manager so downstream phases can resolve project membership deterministically.

#### Scenario: workspace discovery succeeds without pnpm-only metadata
- **WHEN** the analyzed repository uses npm or yarn style workspace metadata instead of pnpm
- **THEN** repository context still includes normalized workspace and package topology for changed files
- **AND** the pipeline does not fail solely because `pnpm-workspace.yaml` is missing

### Requirement: Repository context includes resolved tsconfig graph and path aliases
The system MUST discover and resolve relevant tsconfig files, project references, and path aliases so later TypeScript adapter phases can load projects without duplicate resolution logic.

#### Scenario: project references are resolved transitively for changed files
- **WHEN** a changed file belongs to a tsconfig that references other tsconfig projects
- **THEN** repository context includes the resolved tsconfig graph with deterministic ordering
- **AND** downstream phases can consume that graph without re-scanning repository config files

#### Scenario: path aliases are exposed as reusable repository metadata
- **WHEN** tsconfig files define path aliases
- **THEN** repository context includes normalized alias mappings linked to the resolved tsconfig scope
- **AND** the TypeScript adapter can consume aliases from repository context rather than re-deriving them ad hoc

