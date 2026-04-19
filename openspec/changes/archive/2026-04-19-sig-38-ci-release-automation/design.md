## Context

`signal-diff` currently has local scripts for `lint`, `test`, `typecheck`, and `build`, but no GitHub Actions workflows. The backlog issue for SIG-38 calls for mirroring the baseline automation shape used in `docs-cache`: CI, PR preview workflow, and Release Please automation. Unlike `docs-cache`, `signal-diff` does not yet have an approved public CLI package/install contract, so npm publication must remain gated.

## Goals

- Run baseline validation automatically on pull requests and pushes to `master`.
- Mirror the general docs-cache automation shape for CI, preview, and Release Please.
- Keep release preparation active while explicitly disabling preview/publish until the package contract is ready.
- Document the policy and required maintainer setup.

## Non-Goals

- Finalize the public npm package name or CLI install path.
- Ship a public npm release in this change.
- Add heavyweight checks that the repo does not currently support, such as size limits or dependency audit enforcement.

## Decisions

1. CI will run the existing repo quality gates: `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
2. CI will also run `pnpm build`, because the test script already depends on a successful build and release preparation should validate distributable output.
3. The preview workflow will keep the docs-cache shape and trigger points, but it will exit with a clear gated message instead of publishing to npm until the package install contract is approved.
4. Release Please will be configured now with root package version tracking, but npm publish remains disabled behind an explicit flag documented in the repo.
5. Workflow docs will live in `README.md` so contributors can see current CI and release policy without inspecting workflow YAML.

## Risks And Trade-Offs

- Gating preview/publish means SIG-38 will not yet provide installable preview binaries; that is intentional and should be documented as policy, not left ambiguous.
- Root-level release metadata may evolve once the public package/install contract is finalized.
- Keeping the docs-cache workflow shape while gating publish reduces future rewrite work, but adds one explicit skip path for now.

## Migration Plan

1. Add CI and Release Please files plus gated preview workflow.
2. Add root package version metadata needed by Release Please.
3. Document permissions, secrets, and the current gated npm policy.
4. Revisit preview/publish enablement when the CLI package name, bin entry, and install contract are approved.
