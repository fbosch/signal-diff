# typescript-monorepo-project-loader Specification

## Purpose
TBD - created by archiving change sig-16-ts-morph-monorepo-project-loader. Update Purpose after archive.
## Requirements
### Requirement: Adapter exposes a TypeScript monorepo project loader API
The TypeScript adapter MUST provide a loader API that accepts repository context metadata and returns loaded project context for extraction.

#### Scenario: loader API returns project and file context
- **WHEN** the adapter receives repository context with resolved tsconfig metadata
- **THEN** the loader returns project-level context that includes loaded TypeScript source files
- **AND** downstream extraction can consume this context without re-loading tsconfig metadata

### Requirement: Loader builds ts-morph projects from repository tsconfig graph
The loader MUST construct ts-morph `Project` instances from repository tsconfig project metadata in deterministic order.

#### Scenario: monorepo changed source files resolve through tsconfig graph
- **WHEN** changed source files span one or more workspace packages
- **THEN** the loader resolves those files from tsconfig-backed projects without manual repository-specific rules

### Requirement: Loader includes adjacent files for changed-file neighborhoods
The loader MUST include adjacent source files near changed source files to support downstream companion and contract analysis.

#### Scenario: sibling source files are available beside changed files
- **WHEN** a changed source file is loaded
- **THEN** sibling source files in the same directory are included in loader output as adjacent files

### Requirement: Loader fails loudly for unresolved project or file inputs
The loader MUST fail with explicit error details when tsconfig projects or changed source files cannot be resolved.

#### Scenario: tsconfig path cannot be loaded
- **WHEN** repository context references a missing or invalid tsconfig path
- **THEN** loader execution fails with an error that names the unresolved tsconfig path

#### Scenario: changed source file is not present in any loaded project
- **WHEN** a changed source file cannot be found in loaded ts-morph projects
- **THEN** loader execution fails with an error that names the unresolved changed file path

