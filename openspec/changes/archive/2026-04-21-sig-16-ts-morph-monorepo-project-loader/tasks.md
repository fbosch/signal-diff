## 1. Project loader API

- [x] 1.1 Add adapter-facing ts-morph loader entrypoint that accepts repository context.
- [x] 1.2 Return loaded project/source-file metadata needed by downstream extraction steps.

## 2. Monorepo project loading

- [x] 2.1 Construct ts-morph projects from resolved `tsconfigProjects` metadata.
- [x] 2.2 Load changed source files from loaded projects without per-repo hardcoding.
- [x] 2.3 Load adjacent files for changed-file neighborhoods to support later companion/contract analysis.

## 3. Failure behavior

- [x] 3.1 Fail loudly when configured tsconfig files cannot be loaded.
- [x] 3.2 Fail loudly when changed source files cannot be resolved in loaded projects.

## 4. Validation

- [x] 4.1 Add fixture-backed tests for monorepo loader behavior and adjacency loading.
- [x] 4.2 Add tests for explicit loader error scenarios.
- [x] 4.3 Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
- [x] 4.4 Run `openspec validate sig-16-ts-morph-monorepo-project-loader`.
