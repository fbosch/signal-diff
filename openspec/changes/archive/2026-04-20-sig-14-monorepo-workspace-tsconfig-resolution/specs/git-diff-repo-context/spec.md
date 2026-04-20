## ADDED Requirements

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
