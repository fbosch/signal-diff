# AGENTS

signal-diff is a JSON-first review CLI for TypeScript repos. Keep `packages/core` framework-neutral and keep user-facing workflow changes aligned with OpenSpec.

## Package manager
- Use `pnpm`.

## Workflow
- Do not work directly on `master`. Create a worktree branch first.
- Open a PR for every code or workflow change.
- Prefer `wt step diff` when preparing review context.
- Prefer `wt gate` to commit + run pre-merge checks + push through `no-mistakes`.
- Prefer `wt ready-pr -- --title "..." --body "..."` to run local checks, push branch, and open PR.
- Prefer `wt merge` for local merge flow so `pre-merge` hooks enforce repo validation.
- For Linear triage/planning in this repo, use the `signal-diff` team by default unless the user explicitly asks for a different team.
- If a Linear issue changes public behavior, JSON schema, OpenSpec-backed contracts, package boundaries, or release/install workflow, create or update the matching OpenSpec change before coding.
- After an OpenSpec-backed change is merged to `master`, update its `tasks.md` truthfully and archive it into `openspec/specs/`.

## Validation
- Run `pnpm lint`.
- Run `pnpm test`.
- Run `pnpm typecheck`.
- Keep `.no-mistakes.yaml` commands aligned with `.config/wt.toml` `pre-merge.validate`.
- For OpenSpec-backed work, run `openspec validate <change-name>` before shipping.
