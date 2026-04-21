## 1. Benchmark Harness

- [x] 1.1 Add deterministic benchmark fixtures and scenario definitions for hot paths.
- [x] 1.2 Add benchmark entrypoint(s) for local and CI execution.
- [x] 1.3 Capture benchmark execution controls (warmup, iteration count, sample sizing).

## 2. Result Contract And Baselines

- [ ] 2.1 Add versioned JSON schema for benchmark outputs.
- [ ] 2.2 Add baseline storage/update workflow with auditability.
- [ ] 2.3 Add schema compatibility validation for benchmark outputs.

## 3. CI Automation And Drift Policy

- [ ] 3.1 Add pull request benchmark workflow with drift comparison.
- [ ] 3.2 Add scheduled benchmark workflow on `master` for trend collection.
- [ ] 3.3 Add configurable pass/warn/fail threshold policy.

## 4. Reporting And Documentation

- [ ] 4.1 Add drift reporting outputs (machine-readable and human-readable).
- [ ] 4.2 Add maintainer runbook for baseline refresh and threshold tuning.
- [ ] 4.3 Add troubleshooting guidance for benchmark noise and CI environment variance.

## 5. Validation

- [ ] 5.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [ ] 5.2 Run `openspec validate sig-39-benchmark-drift-automation`.
