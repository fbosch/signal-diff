## MODIFIED Requirements

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

#### Scenario: Phase 3 extraction computes callable signature deltas
- **WHEN** a changed function-like entity is extracted and comparable base/head callable content is available
- **THEN** canonical change output includes signature deltas for input arity, optional/defaulted input count, async state, and explicit return category where practical

#### Scenario: Phase 3 extraction computes contract shape deltas
- **WHEN** a changed contract or type-like entity is extracted and comparable base/head contract content is available
- **THEN** canonical change output includes signature or shape deltas for member count and optional member count where practical

### Requirement: Evidence-backed review surface contracts
The system MUST model findings with structured evidence so reviewers can drill down from conceptual findings to supporting entities, feature deltas, peer anchors, companion candidates, and diff hunks.

#### Scenario: findings carry structured evidence references
- **WHEN** a finding is represented in core contracts
- **THEN** it references structured evidence objects instead of relying only on free-form explanatory text

#### Scenario: review flow supports concept-first drill-down
- **WHEN** the core review surface is represented
- **THEN** it separates conceptual overview, finding detail, supporting evidence, and raw diff references

#### Scenario: signature delta extraction fails loud with explicit fallback
- **WHEN** a changed entity cannot be matched in both base and head source snapshots for signature or contract-shape extraction
- **THEN** canonical change output includes an explicit fallback summary instead of silently emitting zero deltas
