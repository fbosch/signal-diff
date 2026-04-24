## MODIFIED Requirements

### Requirement: Canonical feature, change, and finding model
The system MUST define normalized feature, change, and finding contracts that cover v1 review semantics and are stable enough for later extraction and heuristic issues.

#### Scenario: Phase 3 extraction computes function structural deltas
- **WHEN** a changed function-like entity is extracted and comparable base/head callable content is available
- **THEN** canonical change output includes `structural.branchCount`, `structural.helperCallCount`, and `structural.hasTryCatch` feature deltas

### Requirement: Evidence-backed review surface contracts
The system MUST model findings with structured evidence so reviewers can drill down from conceptual findings to supporting entities, feature deltas, peer anchors, companion candidates, and diff hunks.

#### Scenario: structural delta extraction fails loud with explicit fallback
- **WHEN** a changed function-like entity cannot be matched in both base and head source snapshots
- **THEN** canonical change output includes an explicit fallback summary instead of silently emitting zero deltas
