## ADDED Requirements

### Requirement: v1 JSON review report contract is explicit
The system MUST define an explicit v1 JSON analyzer output contract rather than serializing canonical internal review data directly.

#### Scenario: report exposes explicit top-level sections
- **WHEN** a review surface is serialized for v1 JSON output
- **THEN** the output includes explicit top-level sections for `summary`, `changed_entities`, `findings`, `evidence`, and `diff_references`
- **AND** the output includes a stable schema version marker

#### Scenario: internal core model stays separate from external report schema
- **WHEN** reporting serializes a review surface
- **THEN** it projects canonical internal contracts into report-specific JSON types instead of exposing the raw `ReviewSurface` shape as the public contract

### Requirement: summary section matches concept-first review flow
The JSON report MUST expose a summary section that surfaces the concept-first overview a reviewer sees before drilling into findings.

#### Scenario: summary carries high-level review metadata
- **WHEN** a JSON review report is produced
- **THEN** `summary` includes changed file count, changed entity count, total finding count, and highest-priority finding references

### Requirement: findings and evidence remain linked but separate
The JSON report MUST model findings and evidence as separate collections linked through stable IDs.

#### Scenario: finding points to supporting evidence
- **WHEN** a finding is serialized into JSON
- **THEN** it references one or more evidence IDs
- **AND** the matching evidence entries contain structured entity, change, and diff references

### Requirement: reporting exposes a validation boundary
The reporting package MUST provide a validation boundary that can assert whether a produced object matches the v1 JSON report contract.

#### Scenario: serializer output can be validated locally
- **WHEN** the reporting package produces a v1 JSON report
- **THEN** callers can validate or assert the result against the expected contract without depending on CLI-only logic
