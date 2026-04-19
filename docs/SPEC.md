# Semantic Review Surface for Human Validation of AI-Generated Code

## Purpose

Build a tool that helps a human review AI-generated code by changing the **entry point of review** from raw file diffs to a **conceptual, evidence-backed view of change**.

The tool does **not** replace code review. It improves the human reviewer’s ability to:

- understand what changed in principle
- identify pattern shifts and suspicious divergence
- detect incomplete or low-cohesion changes
- prioritize where to inspect the actual diff
- drill down from conceptual findings into supporting evidence and raw diffs

The tool is **not** an AI reviewer that posts comments and declares code correct. It is a **semantic review surface** for a human in the middle.

---

## Problem Statement

AI makes code generation cheap. This increases the volume of code that must be validated by humans.

Traditional PR review assumes:

- line-by-line diffs are the primary source of truth
- the human can reconstruct intent from changed lines
- the main review task is syntactic inspection

That model degrades as AI-generated change volume increases.

The actual human task becomes:

- understanding the conceptual nature of the change
- checking whether the change fits the system
- checking whether the change is complete
- validating whether the concrete diffs support the conceptual interpretation

The new required review flow is:

1. **Conceptual parse first**
2. **Evidence-backed drill-down second**
3. **Raw diff inspection last**

---

## Product Goal

Transform a raw code change into a **ranked, pattern-aware, evidence-linked review surface** that helps a human reviewer decide:

- what kind of change this is
- what seems to have changed structurally or behaviorally
- where the highest risk is
- what likely companion changes are missing
- which exact diffs support those conclusions

---

## Non-Goals

The tool will **not** initially:

- act as an autonomous reviewer that approves or rejects code
- require user-defined rules to be useful
- require project-specific annotations
- aim to prove correctness
- replace test suites, linters, static analysis, or security scanners
- support all languages in v1
- deeply understand every framework in v1

---

## Core Product Principles

### 1. Concept-first review
The tool must present a conceptual interpretation before exposing the raw diff.

### 2. Evidence-backed findings
Every conceptual finding must be traceable to:

- changed entities
- supporting structural evidence
- supporting diff hunks

### 3. Zero-config usefulness
The tool must provide useful findings out of the box based on code structure alone.

### 4. Language-agnostic core
The core logic must operate on normalized programming concepts, not TypeScript-specific concepts.

### 5. Heuristics-first, AI-second
Deterministic heuristics are the source of truth. AI is used only for:

- summarization
- grouping
- ranking
- wording

### 6. Drill-down is mandatory
The tool must preserve traditional diff inspection as a later stage in the flow.

---

## Target Users

### Primary
Engineers reviewing AI-generated or AI-assisted pull requests.

### Secondary
Tech leads and senior engineers reviewing larger changes where line-by-line review is no longer an effective entry point.

---

## User Jobs

A reviewer wants to answer:

1. What changed conceptually?
2. Does this change seem to alter an established pattern?
3. Is the change complete?
4. Which parts deserve close inspection?
5. What exact diffs support the conceptual findings?
6. Does the implementation actually hold up under detailed review?

---

## User Experience Summary

The tool presents review in four layers:

### Layer 1 — Overview
A conceptual summary of the change:

- change categories
- major findings
- likely pattern changes
- likely missing companion changes
- high-risk areas

### Layer 2 — Finding detail
For each finding:

- explanation
- changed entities involved
- peer comparison summary
- why it was flagged

### Layer 3 — Supporting evidence
For each finding:

- exact changed symbols/modules
- evidence features
- relevant diff hunks
- related unchanged context
- peer entities used for comparison

### Layer 4 — Raw diff
Traditional file-level diff inspection.

---

## Version Plan

### v1
TypeScript-first, heuristics-first, zero-config, local CLI output.

Focus:

- TypeScript codebases
- structural and semantic extraction from AST/compiler analysis
- concept-first review summary
- supporting evidence links
- raw diff drill-down
- no LSP
- no user-defined rules
- no framework-specific packs required

### v2
Improved clustering, optional AI synthesis, better UI, stronger companion inference.

### v3
Multi-language support through language adapters and normalized IR.

---

## v1 Scope

### In Scope
- analyze diff between base and head
- parse TypeScript / TSX code
- extract normalized entities and relationships
- detect core conceptual findings from heuristics
- produce a review report with:
  - overview
  - findings
  - supporting evidence
  - relevant diff hunks
- show full raw diff paths for drill-down
- infer likely peer groups without manual rules

### Out of Scope
- GitHub app
- editor plugin
- comment posting
- framework packs
- multi-language support
- ML model training
- historical learning from past PRs
- fine-grained semantic equivalence proof

---

## Core Architecture

The system is divided into four major layers:

### 1. Input layer
Consumes:

- git diff
- base revision
- head revision
- repository filesystem

### 2. Extraction layer
Language-specific extraction for TypeScript:

- parse code
- build symbols/entities
- extract relationships
- extract normalized features

### 3. Heuristic engine
Runs language-agnostic findings over normalized graph and change data.

### 4. Presentation layer
Produces the review surface in CLI-friendly structured output.

Optional later:

- local web UI
- editor integration

---

## Canonical Core Model

This is the abstraction boundary that prevents TypeScript lock-in.

### Entities
Normalized units of code meaning.

#### Required entity kinds in v1
- `module`
- `function`
- `method`
- `contract`
- `type_like_entity`
- `field`
- `render_unit`
- `test_artifact`
- `example_artifact`
- `configuration_unit`

#### Notes
In TypeScript v1:

- exported functions map to `function`
- interfaces/type aliases/classes map to `contract` or `type_like_entity`
- JSX-returning functions map to `render_unit`
- test files / test blocks map to `test_artifact`

### Relationships
Normalized edges between entities.

#### Required relationship kinds in v1
- `contains`
- `exports`
- `imports`
- `calls`
- `uses_type`
- `extends`
- `implements`
- `tests`
- `constructs`

### Features
Each entity has normalized features.

#### Signature features
- input arity
- input category
- output category
- optional/defaulted inputs
- visibility
- async/sync

#### Structural features
- branch count
- try/catch presence
- wrapper/helper usage count
- delegation level
- object construction presence
- stateful/stateless
- JSX/render structure presence

#### Behavioral features
- side-effect profile
- fallback behavior
- error-handling style
- orchestration level
- transformation density

#### Topology features
- container module
- package/location
- public/internal role
- adjacency to tests/examples
- import fan-in / fan-out

### Changes
Normalized change descriptors.

#### Required change kinds in v1
- entity added
- entity removed
- entity modified
- public contract changed
- dependency edge added/removed
- control-flow expanded/reduced
- fallback behavior changed
- async behavior changed
- side-effect profile changed
- visibility changed

### Findings
Heuristic outputs shown to the reviewer.

#### Required finding kinds in v1
- peer divergence
- likely pattern change
- public contract drift
- likely new abstraction
- boundary anomaly
- likely incomplete companion change
- behavior shift
- elevated review priority

---

## TypeScript v1 Adapter

v1 is implemented using TypeScript compiler APIs or `ts-morph`.

### Responsibilities
The TypeScript adapter is responsible for:

- parsing `.ts` and `.tsx`
- identifying exported symbols
- identifying functions, methods, interfaces, classes, type aliases
- identifying imports/exports
- identifying references and type usage where practical
- extracting normalized signature/behavior/topology features
- mapping TypeScript syntax into canonical entity and edge model

### Mapping examples

#### TypeScript function
Maps to:
- `function`
- maybe `render_unit` if JSX-returning

#### Interface / type alias / class used as shape
Maps to:
- `contract` or `type_like_entity`

#### JSX-returning function component
Maps to:
- `render_unit`

#### Test file / test block
Maps to:
- `test_artifact`

#### Import statement
Maps to:
- `imports` relationship

#### Exported item
Maps to:
- `exports` relationship

---

## v1 Heuristic Backbone

The v1 heuristics must be grounded in:

- entity shape
- signature changes
- relationship changes
- topology changes
- peer comparison
- companion inference

No user-defined rules are required.

### Peer groups
The system must infer local peers automatically using:

- entity kind
- container/module similarity
- dependency similarity
- signature similarity
- structural similarity
- path/topology similarity

Peer groups are used to determine whether a changed entity diverges from its local family.

### Companion relationships
The system must infer likely companion artifacts and consumers based on:

- tests colocated with changed modules
- stories/examples near UI/render units
- type consumers for changed contracts
- import graph dependents
- related implementation/test adjacency

---

## v1 Heuristic Findings

### 1. Public contract drift
**Trigger**
A public/exported entity changes in:

- input shape
- output shape
- optionality/defaulting
- visibility
- contract fields

**Why it matters**
This may affect downstream consumers even when the diff looks small.

**Evidence**
- changed exported entity
- changed contract features
- consumer count or key uses

### 2. Peer divergence
**Trigger**
A changed entity differs materially from nearest peers on multiple dimensions, such as:

- async behavior
- return shape
- error handling
- side-effect profile
- orchestration level
- helper usage
- structure/topology

**Why it matters**
This may indicate a pattern change or local inconsistency.

**Evidence**
- changed entity
- peer entities used as comparison anchors
- feature deltas

### 3. Likely pattern change
**Trigger**
A changed entity either:

- diverges strongly from its old peer family
- begins forming a new micro-pattern
- shifts role materially, such as transformer → orchestrator

**Why it matters**
The human reviewer should validate whether this is deliberate and appropriate.

**Evidence**
- peer divergence
- role shift
- control-flow or side-effect increase
- dependency changes

### 4. Likely new abstraction
**Trigger**
A new function/module/helper is introduced and:

- has low reuse
- overlaps substantially with nearby logic
- changes architecture shape without clear need

**Why it matters**
AI often introduces unnecessary abstractions.

**Evidence**
- new entity
- reuse count
- similarity to existing entities
- relationship graph changes

### 5. Boundary anomaly
**Trigger**
A changed entity adds dependency edges that appear unusual relative to topology, such as:

- feature-local code reaching into deeper internals
- previously isolated module importing broader/shared concerns
- dependency fan-out widening materially

**Why it matters**
May indicate layer leakage or architecture drift.

**Evidence**
- new imports
- changed module topology features
- peer/topology comparison

### 6. Behavior shift
**Trigger**
A changed entity materially changes:

- async behavior
- fallback behavior
- error strategy
- branch count
- side-effect profile

**Why it matters**
Behavior may have changed even if function name and role appear unchanged.

**Evidence**
- pre/post feature deltas
- relevant diff hunks
- peer comparison where useful

### 7. Likely incomplete companion change
**Trigger**
A changed entity suggests related artifacts or consumers should also have changed, but they did not.

**Initial v1 cases**
- changed public contract with unchanged obvious consumers
- changed render unit with no nearby tests/examples touched
- changed behavior with no related tests touched
- changed type-like entity with limited downstream adjustment

**Why it matters**
AI changes are often locally plausible but globally incomplete.

**Evidence**
- changed entity
- inferred companions
- unchanged related nodes

### 8. Elevated review priority
**Trigger**
Any entity or module with high combined risk based on:

- public contract drift
- peer divergence
- behavior shift
- wide consumer impact
- boundary anomaly

**Why it matters**
This helps route reviewer attention.

---

## Review Flow

### Stage 1 — Conceptual overview
The tool outputs:

- overall change summary
- top conceptual findings
- ranked review targets

### Stage 2 — Finding exploration
The reviewer selects a finding and sees:

- description
- why it was flagged
- changed entities
- peer comparison summary
- likely risk

### Stage 3 — Evidence drill-down
For each finding:

- supporting changed entities
- evidence features
- supporting diff hunks
- related files
- comparison anchors

### Stage 4 — Raw diff inspection
The reviewer can inspect traditional diffs for final validation.

---

## CLI Product for v1

### Command
```bash
review-surface analyze --base origin/main --head HEAD
```

### Optional flags
```bash
review-surface analyze --base origin/main --head HEAD --format json
review-surface analyze --base origin/main --head HEAD --format markdown
review-surface analyze --base origin/main --head HEAD --max-findings 20
review-surface analyze --base origin/main --head HEAD --include-diff-hunks
```

### Output formats
- human-readable markdown/text
- machine-readable JSON

---

## v1 Output Structure

### Overview
Contains:
- files changed
- entities changed
- top findings
- highest-priority review targets

### Findings section
Each finding includes:
- finding id
- finding kind
- severity/priority
- title
- concise description
- changed entities involved
- supporting evidence summary

### Evidence section
Each finding includes:
- entity list
- feature deltas
- peer comparison anchors
- companion candidates
- diff hunk references

### Raw diff references
Paths and hunk locations for drill-down.

---

## Example v1 Markdown Output

```md
# Review Surface

## Overview
- Files changed: 12
- Changed entities: 18
- Top findings: 4

## Highest Priority Review Targets
1. `submitOrder` — likely pattern change
2. `OrderPayload` — public contract drift
3. `OrderCard` — likely incomplete companion change

## Findings

### F-001 — Likely pattern change
**Entity:** `submitOrder`
**Priority:** High

This function appears to have shifted from a transformer/validation role toward an orchestrator role.

**Why flagged**
- async behavior introduced
- external interaction count increased
- side-effect profile increased
- branch count increased from 0 to 2

**Peer anchors**
- `validateOrder`
- `mapOrderResponse`
- `normalizeOrderPayload`

**Supporting diff hunks**
- `src/order/submitOrder.ts:12-38`
- `src/order/api.ts:40-60`

### F-002 — Public contract drift
**Entity:** `OrderPayload`
**Priority:** High

An exported contract gained optional fields and widened consumer-facing shape.

**Why flagged**
- optional field count increased
- exported type changed
- used by 6 downstream entities

**Supporting diff hunks**
- `src/order/types.ts:4-12`

### F-003 — Likely incomplete companion change
**Entity:** `OrderCard`
**Priority:** Medium

Behavior changed, but no nearby tests or examples were updated.

**Why flagged**
- render-unit behavior changed
- nearest test artifact unchanged
- no example/story artifacts touched

**Supporting diff hunks**
- `src/order/components/OrderCard.tsx:20-52`
```

---

## JSON Output Schema for v1

### Top-level
```json
{
  "summary": {},
  "changed_entities": [],
  "findings": [],
  "diff_references": []
}
```

### Summary
```json
{
  "files_changed": 12,
  "entities_changed": 18,
  "top_finding_count": 4
}
```

### Changed entity
```json
{
  "id": "entity:src/order/submitOrder.ts#submitOrder",
  "kind": "function",
  "name": "submitOrder",
  "module": "src/order/submitOrder.ts",
  "visibility": "public",
  "changed_features": {
    "async": { "before": false, "after": true },
    "branch_count": { "before": 0, "after": 2 },
    "side_effect_profile": { "before": "low", "after": "high" }
  }
}
```

### Finding
```json
{
  "id": "F-001",
  "kind": "likely_pattern_change",
  "priority": "high",
  "title": "submitOrder shifted role",
  "description": "This function appears to have shifted from a transformer-like role toward an orchestrator-like role.",
  "entities": ["entity:src/order/submitOrder.ts#submitOrder"],
  "peer_anchors": [
    "entity:src/order/validateOrder.ts#validateOrder",
    "entity:src/order/normalizeOrderPayload.ts#normalizeOrderPayload"
  ],
  "evidence": {
    "feature_deltas": [
      "async introduced",
      "side-effect profile increased",
      "branch count increased"
    ],
    "diff_hunks": [
      {
        "file": "src/order/submitOrder.ts",
        "start_line": 12,
        "end_line": 38
      }
    ]
  }
}
```

---

## Detailed v1 Technical Design

### Extraction pipeline

#### Step 1 — Determine changed files
Use git diff between base and head.

#### Step 2 — Parse relevant TypeScript files
Parse changed TS/TSX files and adjacent related files where needed:
- directly changed files
- exported contract files referenced by changes
- obvious companion files such as colocated tests/examples

#### Step 3 — Build entity graph
Construct normalized entities and relationships.

#### Step 4 — Compute pre/post features
For changed entities, compute features on both base and head where possible.

#### Step 5 — Build peer candidates
Infer nearest peers based on:
- kind
- module/path similarity
- feature similarity
- dependency similarity
- signature similarity

#### Step 6 — Run heuristics
Emit findings.

#### Step 7 — Render output
Produce markdown or JSON.

### Peer inference strategy for v1

No user-defined rules.

Score peer similarity using weighted signals:

- same entity kind
- similar container path
- similar dependency footprint
- similar signature shape
- similar behavior profile
- similar topology role
- name similarity as weak signal only

This is sufficient for useful v1 peer comparison.

### Companion inference strategy for v1

Infer likely companions using:

- file adjacency:
  - `foo.ts` ↔ `foo.test.ts`
  - `foo.tsx` ↔ `foo.test.tsx`
  - `foo.tsx` ↔ `foo.stories.tsx`
- import relationships
- type consumers
- exported/public relationships
- colocated example/demo files if present

This should stay conservative in v1.

---

## Severity and Priority Model

v1 priority is deterministic.

### High
- public contract drift with downstream usage
- strong peer divergence
- strong behavior shift
- boundary anomaly in shared/public code

### Medium
- new abstraction with low reuse
- incomplete companion suspicion
- moderate peer divergence

### Low
- small isolated changes with weak divergence signal

Priority affects only ranking, not verdict.

---

## AI Usage by Version

### v1
No AI required.
Everything can be deterministic.

Optional later:
- better wording of findings
- grouping related low-level signals

### v2
AI may be used for:
- conceptual clustering
- summarization
- better title/description generation

AI must not create unsupported findings without deterministic evidence.

---

## v2 Specification

### Goals
Improve usefulness, trust, and readability without changing the core abstraction.

### Scope
- optional AI synthesis layer
- better peer clustering
- better companion inference
- local HTML/web report
- more precise behavior-role inference
- finding grouping across entities

### New capabilities

#### Grouped conceptual findings
Instead of one finding per entity, group related findings:
- “data-access pattern change across 3 functions”
- “contract widening across order payload layer”

#### Better evidence presentation
- side-by-side peer comparison
- more targeted diff snippets
- more contextual supporting files

#### Better scoring
More nuanced risk ranking.

#### Optional review narratives
AI-generated summary paragraphs based only on deterministic evidence.

---

## v3 Specification

### Goal
Support additional languages while preserving the same product model.

### Scope
- language adapters for Python, Go, Rust, Java, etc.
- canonical IR remains unchanged
- heuristics remain largely shared
- optional language/framework enrichment packs

### Architecture
Each language adapter must:
- parse source
- emit canonical entities
- emit canonical relationships
- emit normalized features
- map language syntax into common concepts

### Framework/ecosystem packs
Optional enrichments:
- React
- Django
- FastAPI
- Spring
- Go HTTP handlers
- Rust traits/impl ecosystems

These must remain additive, not foundational.

---

## Suggested Implementation Roadmap

### Phase 0 — Foundation
- define canonical model
- define v1 output schema
- define finding taxonomy
- define TypeScript mapping rules

### Phase 1 — Minimal extractor
- git diff ingestion
- changed file parsing
- entity extraction
- imports/exports
- basic feature extraction

### Phase 2 — Basic findings
Implement:
- public contract drift
- behavior shift
- likely new abstraction
- likely incomplete companion change

### Phase 3 — Peer inference
- similarity scoring
- peer anchor selection
- peer divergence finding
- likely pattern change finding

### Phase 4 — Better report rendering
- markdown output
- JSON output
- evidence linking
- diff hunk references

### Phase 5 — v1 stabilization
- sample repo testing
- false-positive reduction
- ranking tuning

---

## Recommended v1 Heuristic Order

Build in this order:

1. **Public contract drift**
2. **Behavior shift**
3. **Likely incomplete companion change**
4. **Likely new abstraction**
5. **Peer divergence**
6. **Likely pattern change**
7. **Boundary anomaly**

This order gives useful output early without requiring full sophistication immediately.

---

## Acceptance Criteria for v1

v1 is successful if, on a typical TypeScript PR, it can:

- identify changed public contracts
- identify at least some behavior-shifting functions/modules
- identify likely missing tests/examples in common cases
- identify at least one meaningful peer comparison for suspicious changed entities
- output conceptual findings before raw diffs
- let the reviewer trace every finding to exact supporting diffs

---

## Success Metrics

### Qualitative
- reviewer can explain the conceptual change faster than with raw diff alone
- reviewer finds suspicious areas earlier
- reviewer still trusts the output because evidence is visible

### Quantitative
Later, once used in practice:
- reduced time to identify highest-risk changed entities
- increased reviewer interaction with targeted diff hunks vs full diff scan
- reduced missed incomplete changes
- reduced review fatigue on AI-heavy PRs

---

## Open Design Constraints

These are intentionally deferred from v1:

- exact similarity algorithm for peer clustering
- advanced semantic call graph accuracy
- framework-aware enrichments
- learned patterns from repository history
- full local web UI
- GitHub integration

---

## Final v1 Product Definition

A local CLI tool for TypeScript repositories that analyzes a git diff and produces a **concept-first review report** with:

- changed entities
- conceptual findings
- peer-based divergence signals
- likely incomplete companion changes
- evidence-backed drill-down to exact diff hunks
- raw diff references for final inspection

It is zero-config, heuristics-first, and built on a language-agnostic internal model so later language support can be added without redesigning the core.

---

## Concrete Build Recommendation

For v1, use:

- **TypeScript compiler API or ts-morph** for extraction
- **git diff parsing** for change scope
- **your own canonical model** for entities, edges, features, and findings
- **deterministic heuristics only**
- **markdown and JSON output**

Do not start with:

- AI-generated findings
- GitHub integration
- multi-language extraction
- fancy UI

That would slow down validation of the core idea.
