## Context

The repository currently validates correctness and types in CI but does not benchmark hot paths in a repeatable way. Performance checks are ad hoc, which prevents reliable trend analysis and regression gating.

## Goals

- Produce deterministic benchmark measurements for core hot paths.
- Persist comparable benchmark outputs with enough metadata for historical analysis.
- Run benchmark automation on both pull requests and on a schedule.
- Surface clear drift signals with configurable thresholds.
- Document maintainer operations for baseline updates and noisy environments.

## Non-Goals

- Build a full observability platform outside repository CI/artifacts.
- Optimize every code path in this change.
- Replace existing functional validation gates.

## Decisions

1. Benchmark harness will run a small set of representative hot-path scenarios with deterministic fixtures and fixed iteration controls.
2. Result artifacts will use a versioned JSON schema with commit SHA, timestamp, runtime/environment metadata, and per-scenario timing statistics.
3. CI will run benchmarks on pull requests for drift checks and on a schedule on `master` for trend collection.
4. Drift policy will classify outcomes into pass, warn, or fail using configurable percentage thresholds.
5. Reporting will include machine-readable JSON plus a concise human-readable summary for maintainers.

## Risks And Trade-Offs

- Benchmark noise may produce false positives on shared runners; mitigated by deterministic fixtures and documented tuning.
- Thresholds that are too strict can block valid changes; thresholds must be calibrated and revisited.
- Storing long-term benchmark history increases artifact and maintenance overhead.

## Migration Plan

1. Implement benchmark harness and deterministic fixtures.
2. Add and validate benchmark output schema and baseline storage conventions.
3. Wire CI PR and scheduled jobs with threshold checks.
4. Add drift reporting and maintainer runbook.
