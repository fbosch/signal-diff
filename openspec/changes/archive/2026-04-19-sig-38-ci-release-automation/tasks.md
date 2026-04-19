## 1. Workflow Wiring

- [x] 1.1 Add CI workflow for pull requests and pushes to `master`.
- [x] 1.2 Add docs-cache-style preview workflow that exits clearly while npm preview publication is gated.
- [x] 1.3 Add Release Please workflow plus config and manifest files.

## 2. Release Contract Setup

- [x] 2.1 Add explicit root package version metadata needed for Release Please.
- [x] 2.2 Document that npm preview/publish remains disabled until the public CLI install contract is approved.

## 3. Validation

- [x] 3.1 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [x] 3.2 Run `openspec validate sig-38-ci-release-automation`.
