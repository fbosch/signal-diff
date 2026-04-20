# signal-diff

JSON-first review CLI for TypeScript repositories.

## Workspace layout

- `packages/core` - canonical model and analyzer contracts
- `packages/adapter-typescript` - TypeScript extraction adapter
- `packages/heuristics` - finding logic
- `packages/reporting` - JSON and markdown report projection
- `packages/cli` - command orchestration

## Tooling baseline

- Package manager: `pnpm`
- Project references build: `tsc -b`
- Linting: `biome`
- Tests: Node's built-in test runner via `tsx --test`

## Commands

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm verify
```
