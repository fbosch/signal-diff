## MODIFIED Requirements

### Requirement: Evidence-backed review surface contracts
The system MUST model findings with structured evidence so reviewers can drill down from conceptual findings to supporting entities, feature deltas, peer anchors, companion candidates, and diff hunks.

#### Scenario: extraction emits deterministic feature delta evidence baseline
- **WHEN** adapter extraction processes changed source modules with available base/head content
- **THEN** canonical changes include deterministic pre/post feature delta values and structured evidence references tied to those deltas

### Requirement: Canonical feature, change, and finding model
The system MUST define normalized feature, change, and finding contracts that cover v1 review semantics and are stable enough for later extraction and heuristic issues.

#### Scenario: first Phase 3 extraction slice computes module topology deltas
- **WHEN** a changed module is extracted in the baseline Phase 3 slice
- **THEN** canonical change output includes `topology.importFanOut` feature deltas computed from base/head module content when both sides are available
