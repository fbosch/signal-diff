# Benchmark Examples

Use these examples to try benchmark output at different complexity levels while CI drift automation is still in progress.

## Prerequisites

```bash
pnpm install
```

## Example Runs

- Quick (light): fast smoke test for diff parsing only.

```bash
pnpm tsx benchmarks/run.ts --scenario=parse-diff-hunks --warmup=1 --samples=6 --iterations=20
```

- Balanced (medium): both scenarios with CI-like controls and JSON output.

```bash
pnpm tsx benchmarks/run.ts --scenario=parse-diff-hunks,typescript-extraction --warmup=1 --samples=8 --iterations=25 --json
```

- Stress (heavy): extraction-focused stress run with higher sample count.

```bash
pnpm tsx benchmarks/run.ts --scenario=typescript-extraction --warmup=2 --samples=16 --iterations=40 --json
```

## What To Check

- `scenarios[].id` shows expected scenario set for the chosen example.
- `mean_ms` and `p95_ms` are present per scenario.
- `checksum` is stable across repeated runs on unchanged code.
- `runtime` and `controls` reflect your local environment and chosen profile.

## Optional Baseline Refresh

```bash
pnpm bench:baseline:update
```

Baseline output path:

- `benchmarks/baselines/benchmark-baseline.v1.json`
