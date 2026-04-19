# signal-diff

## CI and release automation

The repository now includes GitHub Actions workflows for:

- CI on pull requests and pushes to `master`
- a docs-cache-style preview workflow shape
- Release Please PR preparation on `master`

### Current policy

- CI is active now and runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Preview publication through `pkg.pr.new` is intentionally gated.
- npm publish is intentionally gated.

Preview and publish stay disabled until all of these are approved explicitly:

- public CLI package name
- public bin entry
- supported install contract for v1

### Maintainer setup

- GitHub Actions uses the default `GITHUB_TOKEN` for CI and Release Please PR creation.
- No npm token is required yet because npm publication is disabled.
- When npm publication is enabled later, document and add the required npm auth and provenance configuration in the same change.
