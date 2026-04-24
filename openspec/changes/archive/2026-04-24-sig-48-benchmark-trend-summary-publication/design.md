## Context

`benchmark-trend.yml` runs on a schedule and uploads artifacts for each run, but current reporting is limited to one run at a time. The workflow does not compute cross-run trend signals.

## Goals

- Aggregate recent scheduled benchmark run results into a compact trend view.
- Publish both markdown and JSON trend summaries as workflow artifacts.
- Highlight sustained regressions and improvements across a bounded run window.
- Keep implementation deterministic and CI-friendly.

## Non-Goals

- Build external dashboards or long-term storage beyond workflow artifacts.
- Introduce flake-resistant statistical modeling beyond simple deterministic summaries.
- Change benchmark scenario execution semantics.

## Decisions

1. Add a dedicated benchmark trend summary script under `benchmarks/` that consumes multiple run result JSON files.
2. Use a fixed recent-run window (configurable by workflow input/env) to bound compute and artifact download size.
3. Define a machine-readable contract containing run metadata, per-scenario trajectories, and top sustained regressions/improvements.
4. Render a markdown summary from the same contract so step summary and artifacts stay consistent.
5. Keep single source of truth for trend ranking logic in benchmark code (not in inline workflow shell snippets).

## Risks And Trade-Offs

- Missing artifacts from older runs can reduce sample size; summaries must report effective run count.
- Runtime/environment variance can still bias trend interpretation; summary should include runtime metadata coverage.
- API-based artifact retrieval increases workflow complexity and may require explicit permissions.

## Migration Plan

1. Implement trend summary contract and generator for a local set of result files.
2. Update scheduled workflow to fetch recent trend artifacts, run generator, and publish outputs.
3. Update benchmark runbook with trend-summary interpretation and operational guidance.
