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

## Output examples (no extra package scripts)

Run synthetic review JSON output profiles directly:

```bash
pnpm tsx scripts/output-examples.ts
pnpm tsx scripts/output-examples.ts --json
pnpm tsx scripts/output-examples.ts --profile=small --json
pnpm tsx scripts/output-examples.ts --profile=medium --json
pnpm tsx scripts/output-examples.ts --profile=large --json
```
