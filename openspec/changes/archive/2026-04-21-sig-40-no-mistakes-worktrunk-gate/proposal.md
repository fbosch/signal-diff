## Why

The repository has baseline quality checks and a worktree workflow, but there is no shared configuration that connects Worktrunk operations to no-mistakes gated pushes.

Without this integration, contributors can bypass the local gate unintentionally and run inconsistent pre-merge validation commands.

## What Changes

- Add repository-level `no-mistakes` configuration with explicit baseline commands.
- Add repository-level Worktrunk config that includes:
  - a pre-merge validation hook aligned to repo baseline checks
  - aliases for gated push and `wt step` + gated push flow
- Keep changes scoped to workflow config only (no runtime package behavior changes).

## Capabilities

- New capability: `developer-gated-workflow`

## Impact

- Adds `.no-mistakes.yaml` and `.config/wt.toml` as shared workflow defaults.
- Makes `git push no-mistakes` the explicit, scriptable path from Worktrunk.
