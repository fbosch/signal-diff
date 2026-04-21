## ADDED Requirements

### Requirement: TypeScript source constructs are mapped to canonical entity kinds
The TypeScript adapter MUST map changed TypeScript source constructs into language-agnostic canonical entity kinds required by the v1 model.

#### Scenario: changed source file emits canonical entities for core construct families
- **WHEN** a changed TypeScript source file includes functions, render components, contracts, type-like declarations, and class members
- **THEN** extraction emits canonical entities covering `module`, `function`, `render_unit`, `contract`, `type_like_entity`, `method`, and `field`

### Requirement: Canonical entity identifiers are stable across semantic-preserving edits
Canonical entity IDs emitted by the TypeScript adapter MUST remain stable when semantic identity is preserved across base/head revisions.

#### Scenario: body-only edits preserve canonical entity ids
- **WHEN** a changed TypeScript source file updates implementation bodies while preserving entity names and scopes
- **THEN** extracted canonical entity IDs remain unchanged for matching semantic entities

### Requirement: Source extraction integrates with monorepo project loader
The TypeScript adapter MUST use repository context and ts-morph loader outputs to extract entities from changed source files without per-repo hardcoding.

#### Scenario: changed source files are extracted through loader-backed source files
- **WHEN** repository context resolves changed TypeScript files through monorepo tsconfig projects
- **THEN** canonical entities are extracted from loader-provided source files
- **AND** non-source changed files continue to produce canonical entities compatible with existing contracts
