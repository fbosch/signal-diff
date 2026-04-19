## Why

`SIG-10` defined the canonical IR and package boundaries, but `signal-diff` still lacks the actual v1 JSON output contract that later golden tests, markdown rendering, and CLI output must rely on. Without an explicit JSON-first projection now, reporting work will either serialize internal core types directly or invent unstable renderer-specific shapes.

## What Changes

- Define the v1 JSON review report contract as the source-of-truth external output shape.
- Add a typed reporting projection that converts canonical review surfaces into stable JSON sections for summary, changed entities, findings, evidence, and diff references.
- Add a validation boundary so reporting can assert that serialized output matches the v1 contract.
- Keep a clear separation between canonical internal core data and user-facing JSON report fields.

## Capabilities

### New Capabilities
- `json-review-report-contract`: Defines the v1 JSON schema, serializer boundary, and reporting projection contracts for analyzer output.

### Modified Capabilities
- None.

## Impact

- Affects `packages/reporting`, `packages/cli`, `packages/core`, and tests
- Establishes the contract used by `SIG-12` golden outputs and later markdown rendering
- Creates the first explicit external output schema for `signal-diff`
