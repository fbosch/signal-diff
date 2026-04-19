## Why

The current pipeline still runs on hardcoded stub repo context and synthetic diff references. That blocks real analyzer execution because later extraction and heuristics need stable base/head refs, changed file inventory, and exact diff hunk locations as shared input.

## What Changes

- add a git-backed repo context loader that resolves explicit base and head refs
- extract changed file inventory from git diff output and classify files into canonical changed-file kinds
- extract stable diff hunk references with file path and line-range data for later evidence linking
- add fixture-backed tests that prove diff ingestion works against representative local repos and revisions

## Capabilities

- New capability: `git-diff-repo-context`

## Impact

- Affected packages: `packages/core`, `packages/cli`, `tests`, `fixtures`
- Affected behavior: review requests can be constructed from real git refs instead of stub-only repo context
- This establishes the pipeline input contract for later extraction and heuristic issues
