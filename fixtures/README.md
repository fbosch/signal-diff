# Fixtures

Fixture cases live under `fixtures/<case-name>/`.

Conventions:
- `request.json` stores the analyzer request shape used by the test harness.
- `golden/` stores reviewable expected outputs.
- JSON goldens should stay pretty-printed with two-space indentation.
- Golden updates are explicit: set `UPDATE_GOLDENS=1` when intentionally refreshing outputs.

This layout supports synthetic cases now and can grow into multi-package or monorepo fixtures later by expanding `workspaceRoots` and `changedFiles` in each `request.json`.
