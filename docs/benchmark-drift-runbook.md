# Benchmark Drift Runbook

This runbook covers baseline refresh and threshold tuning for benchmark drift checks.

## Baseline refresh

Use this when an intentional performance change makes the current baseline stale.

1. Confirm local workspace is clean and on the target branch.
2. Rebuild and run benchmark profile with baseline update:

```bash
pnpm bench:baseline:update
```

This writes `benchmarks/baselines/benchmark-baseline.v1.json` with current results.

3. Review the baseline diff before commit:

```bash
git diff -- benchmarks/baselines/benchmark-baseline.v1.json
```

4. Run drift compare against the updated baseline to verify status and report output:

```bash
mkdir -p benchmarks/artifacts
pnpm tsx benchmarks/run.ts --json > benchmarks/artifacts/current-benchmark-results.json
pnpm tsx benchmarks/compare.ts \
  --baseline=benchmarks/baselines/benchmark-baseline.v1.json \
  --current=benchmarks/artifacts/current-benchmark-results.json \
  --summary=benchmarks/artifacts/benchmark-drift-summary.md \
  --output=benchmarks/artifacts/benchmark-drift-summary.json
```

5. If the run is expected and stable, commit baseline update with context in commit/PR text.

## Threshold tuning

Default thresholds are:

- warn: `10%`
- fail: `25%`

PR workflow can override thresholds with repository variables:

- `BENCHMARK_WARN_THRESHOLD_PERCENT`
- `BENCHMARK_FAIL_THRESHOLD_PERCENT`

Tune thresholds only after multiple benchmark runs show stable noise boundaries.

### Local threshold rehearsal

Use local compare to evaluate candidate values before changing CI variables:

```bash
pnpm tsx benchmarks/compare.ts \
  --baseline=benchmarks/baselines/benchmark-baseline.v1.json \
  --current=benchmarks/artifacts/current-benchmark-results.json \
  --summary=benchmarks/artifacts/benchmark-drift-summary.md \
  --output=benchmarks/artifacts/benchmark-drift-summary.json \
  --warn-threshold=12 \
  --fail-threshold=30
```

Rules:

- keep `fail >= warn`
- prefer small changes (for example, 2-5 points at a time)
- document reason for each threshold update in PR description

## Decision guide

- Drift status `pass`: no action needed.
- Drift status `warn`: inspect summary, decide whether to optimize now or accept risk.
- Drift status `fail`: either optimize regression or refresh baseline if change is intentional and approved.

## Troubleshooting benchmark noise and CI variance

### Symptom: intermittent `warn` or `fail` on unchanged code

1. Re-run the benchmark profile locally at least three times.
2. Compare the drift summaries for spread in p95 and mean deltas.
3. If spread is high, tune thresholds in small increments and re-check.

```bash
mkdir -p benchmarks/artifacts
pnpm tsx benchmarks/run.ts --json > benchmarks/artifacts/current-benchmark-results.json
pnpm tsx benchmarks/compare.ts \
  --baseline=benchmarks/baselines/benchmark-baseline.v1.json \
  --current=benchmarks/artifacts/current-benchmark-results.json \
  --summary=benchmarks/artifacts/benchmark-drift-summary.md \
  --output=benchmarks/artifacts/benchmark-drift-summary.json
```

### Symptom: CI warns about runtime mismatch

`benchmarks/compare.ts` emits a warning when baseline and current runtime signatures differ.
Example mismatch: different `node_version` or `platform/arch`.

Actions:

1. Verify local Node version matches CI (`22` in workflow).
2. Avoid comparing results across different runner classes or architectures.
3. Refresh baseline from the same environment used for PR drift checks.

### Symptom: compare step fails with controls mismatch

Baseline and current runs must share the same `warmup/samples/iterations` controls.

Actions:

1. Re-run current benchmark with CI-aligned controls.
2. If baseline was produced with different controls, refresh baseline with the intended controls.

CI profile controls:

```bash
pnpm tsx benchmarks/run.ts --json
```

This uses the benchmark defaults (`warmup=2`, `samples=12`, `iterations=30`), matching `.github/workflows/benchmark-pr-drift.yml`.

### Symptom: missing or new scenarios trigger `fail`

Drift analysis fails loud when scenario sets diverge.

Actions:

1. Confirm scenario id changes are intentional.
2. If intentional, regenerate and review baseline updates.
3. If not intentional, restore scenario parity before re-running compare.

### Incident checklist for noisy benchmark failures

- capture `benchmarks/artifacts/benchmark-drift-summary.md`
- capture `benchmarks/artifacts/benchmark-drift-summary.json`
- record runtime metadata from baseline and current result files
- include threshold values used in the run
- link the exact commit SHA and workflow run in issue or PR discussion

## Trend summary operations

Scheduled benchmark trend runs publish:

- `benchmarks/artifacts/benchmark-trend-summary.md`
- `benchmarks/artifacts/benchmark-trend-summary.json`

Trend summary fields to inspect first:

- `window_size`, `included_runs`, `missing_runs`
- `runtime_signatures` and `controls_signatures`
- `top_regressions` and `top_improvements`

Interpretation rules:

- sustained regression: both mean and p95 deltas trend non-negative across the window
- sustained improvement: both mean and p95 deltas trend non-positive across the window
- mixed-sign scenarios are excluded from sustained highlight lists

### Troubleshooting partial trend history

If `missing_runs > 0`, the workflow could not collect enough prior artifacts for the configured trend window.

Actions:

1. Verify `BENCHMARK_TREND_WINDOW` is realistic for available historical runs.
2. Confirm prior scheduled runs completed successfully and uploaded `benchmark-trend-master` artifacts.
3. Re-run trend workflow manually after next successful scheduled run to fill window depth.

## Required checks after baseline or threshold changes

```bash
pnpm lint
pnpm test
pnpm typecheck
```
