# canonical-review-model Specification

## Purpose
TBD - created by archiving change sig-10-canonical-ir-boundaries. Update Purpose after archive.
## Requirements
### Requirement: Canonical entity and relationship model
The system MUST define a language-agnostic canonical model for v1 entities and relationships so extraction and heuristics can operate on normalized programming concepts instead of TypeScript-specific syntax.

#### Scenario: v1 entity kinds are represented canonically
- **WHEN** the core contracts are defined for v1
- **THEN** they include entity kinds covering `module`, `function`, `method`, `contract`, `type_like_entity`, `field`, `render_unit`, `test_artifact`, `example_artifact`, and `configuration_unit`

#### Scenario: v1 relationship kinds are represented canonically
- **WHEN** the core contracts are defined for v1
- **THEN** they include relationship kinds covering `contains`, `exports`, `imports`, `calls`, `uses_type`, `extends`, `implements`, `tests`, and `constructs`

### Requirement: Canonical feature, change, and finding model
The system MUST define normalized feature, change, and finding contracts that cover v1 review semantics and are stable enough for later extraction and heuristic issues.

#### Scenario: v1 feature families are represented canonically
- **WHEN** the core contracts are defined for v1
- **THEN** they include signature, structural, behavioral, and topology feature families as normalized concepts rather than language-specific AST fields

#### Scenario: v1 change kinds are represented canonically
- **WHEN** the core contracts are defined for v1
- **THEN** they include canonical change kinds for added, removed, modified, public-contract, dependency-edge, control-flow, fallback, async, side-effect, and visibility changes

#### Scenario: v1 finding kinds are represented canonically
- **WHEN** the core contracts are defined for v1
- **THEN** they include public contract drift, behavior shift, peer divergence, likely pattern change, likely new abstraction, boundary anomaly, likely incomplete companion change, and elevated review priority

### Requirement: Evidence-backed review surface contracts
The system MUST model findings with structured evidence so reviewers can drill down from conceptual findings to supporting entities, feature deltas, peer anchors, companion candidates, and diff hunks.

#### Scenario: findings carry structured evidence references
- **WHEN** a finding is represented in core contracts
- **THEN** it references structured evidence objects instead of relying only on free-form explanatory text

#### Scenario: review flow supports concept-first drill-down
- **WHEN** the core review surface is represented
- **THEN** it separates conceptual overview, finding detail, supporting evidence, and raw diff references

### Requirement: Package boundaries preserve language-agnostic core
The system MUST define package boundary rules that allow language adapters to depend on core contracts without allowing TypeScript-specific types or compiler shapes to flow back into `packages/core`.

#### Scenario: adapter depends on core without backflow
- **WHEN** `packages/adapter-typescript` exports integration points for the rest of the system
- **THEN** those integration points use canonical core contracts rather than TypeScript compiler or ts-morph types

#### Scenario: package dependency direction is explicit
- **WHEN** package interfaces are defined
- **THEN** dependency direction is explicit such that `core` is independent, adapters and heuristics depend on `core`, and CLI performs orchestration across packages

