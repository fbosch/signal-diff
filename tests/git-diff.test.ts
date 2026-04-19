import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  buildStubReviewSurfaceFromGit,
  createReviewRequestFromGit,
  loadRepoContextFromGit,
} from "../packages/cli/src/index.ts"

const NAME_TEMPLATE = "$" + "{name}"

function runGit(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim()
}

function writeFile(
  repoRoot: string,
  relativePath: string,
  content: string,
): void {
  const filePath = path.join(repoRoot, relativePath)

  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, content)
}

function createDiffFixtureRepo(): { repoRoot: string; baseRef: string } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "signal-diff-git-"))

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "src/app.ts",
    [
      "export function greet(name: string): string {",
      `  return \`hello ${NAME_TEMPLATE}\``,
      "}",
      "",
      "export function parting(name: string): string {",
      `  return \`bye ${NAME_TEMPLATE}\``,
      "}",
      "",
    ].join("\n"),
  )
  writeFile(repoRoot, "README.md", "# fixture repo\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(
    repoRoot,
    "src/app.ts",
    [
      "export function greet(name: string): string {",
      `  return \`hello there ${NAME_TEMPLATE}\``,
      "}",
      "",
      "export function parting(name: string): string {",
      `  return \`goodbye ${NAME_TEMPLATE}\``,
      "}",
      "",
    ].join("\n"),
  )
  writeFile(
    repoRoot,
    "src/app.test.ts",
    ["import { greet } from './app'", "", "void greet('test')", ""].join("\n"),
  )
  writeFile(repoRoot, "biome.json", '{ "formatter": { "enabled": true } }\n')
  writeFile(repoRoot, "docs/notes.md", "Updated notes\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

test("git diff ingestion resolves refs, changed files, and hunks", () => {
  const { repoRoot, baseRef } = createDiffFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      workspaceRoots: [repoRoot],
      baseRef,
      headRef: "HEAD",
    })

    assert.equal(repoContext.resolvedBaseRef, baseRef)
    assert.match(repoContext.resolvedHeadRef ?? "", /^[0-9a-f]{40}$/)
    assert.deepEqual(repoContext.changedFiles, [
      { path: "biome.json", kind: "configuration" },
      { path: "docs/notes.md", kind: "documentation" },
      { path: "src/app.test.ts", kind: "test" },
      { path: "src/app.ts", kind: "source" },
    ])
    assert.equal(repoContext.diffReferences?.length, 5)
    assert.deepEqual(
      repoContext.diffReferences?.map((reference) => reference.filePath),
      [
        "biome.json",
        "docs/notes.md",
        "src/app.test.ts",
        "src/app.ts",
        "src/app.ts",
      ],
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("git-backed stub pipeline preserves diff-loaded repo context", () => {
  const { repoRoot, baseRef } = createDiffFixtureRepo()

  try {
    const request = createReviewRequestFromGit({
      repoRoot,
      workspaceRoots: [repoRoot],
      baseRef,
      headRef: "HEAD",
      format: "json",
      maxFindings: 10,
      includeDiffHunks: true,
    })
    const reviewSurface = buildStubReviewSurfaceFromGit({
      repoRoot,
      workspaceRoots: [repoRoot],
      baseRef,
      headRef: "HEAD",
      format: "json",
      maxFindings: 10,
      includeDiffHunks: true,
    })

    assert.equal(request.repoContext.changedFiles.length, 4)
    assert.equal(reviewSurface.overview.changedFileCount, 4)
    assert.equal(reviewSurface.diffReferences.length, 5)
    assert.deepEqual(
      reviewSurface.diffReferences,
      request.repoContext.diffReferences,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
