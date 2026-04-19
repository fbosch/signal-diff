## Why

`signal-diff` still has no repository pipelines, so validation only happens locally and release flow remains undefined. That blocks reliable PR review, makes future required status checks impossible, and leaves package preview and release semantics ambiguous.

## What Changes

- Add GitHub Actions CI for pull requests and pushes to `master` using the repo's pnpm and Node versions.
- Add a docs-cache-style preview workflow shape, but gate npm preview publication until the public CLI install contract is finalized.
- Add Release Please configuration and workflow so versioning and release PR flow exist before package publication is enabled.
- Document the gated publish policy, required permissions, and maintainer workflow in repo docs.

## Capabilities

- New capability: `ci-and-release-automation`

## Impact

- Affects `.github/workflows`, release automation config files, root package metadata, and README documentation.
- Establishes CI immediately while keeping preview/publish semantics explicitly disabled until a later package-distribution decision is approved.
