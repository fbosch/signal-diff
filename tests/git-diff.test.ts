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

function createMonorepoFixtureRepo(): { repoRoot: string; baseRef: string } {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "signal-diff-monorepo-"))

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "monorepo-fixture",
        private: true,
        workspaces: ["packages/*"],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "tsconfig.json",
    `${JSON.stringify(
      {
        files: [],
        references: [{ path: "./packages/a" }, { path: "./packages/b" }],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "packages/a/package.json",
    `${JSON.stringify({ name: "a", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/b/package.json",
    `${JSON.stringify({ name: "b", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/a/tsconfig.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@pkg-b/*": ["../b/src/*"],
          },
        },
        references: [{ path: "../b" }],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "packages/b/tsconfig.json",
    `${JSON.stringify({ compilerOptions: {} }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/a/src/index.ts",
    ["export const value = 1", ""].join("\n"),
  )
  writeFile(
    repoRoot,
    "packages/b/src/index.ts",
    ["export const peer = 1", ""].join("\n"),
  )
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(
    repoRoot,
    "packages/a/src/index.ts",
    ["export const value = 2", ""].join("\n"),
  )
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

function createRecursiveWorkspaceFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "signal-diff-recursive-"))

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "recursive-fixture",
        private: true,
        workspaces: ["packages/**"],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "tsconfig.json",
    `${JSON.stringify({ files: [] }, null, 2)}\n`,
  )

  writeFile(
    repoRoot,
    "packages/a/package.json",
    `${JSON.stringify({ name: "a", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/nested/b/package.json",
    `${JSON.stringify({ name: "b", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/a/tsconfig.json",
    `${JSON.stringify({ compilerOptions: {} }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/nested/b/tsconfig.json",
    `${JSON.stringify({ compilerOptions: {} }, null, 2)}\n`,
  )
  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 1\n")
  writeFile(repoRoot, "packages/nested/b/src/index.ts", "export const b = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 2\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

function createAbsoluteWorkspaceRootsFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "signal-diff-abs-roots-"))

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "abs-roots-fixture",
        private: true,
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "tsconfig.json",
    `${JSON.stringify({ files: [] }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/a/package.json",
    `${JSON.stringify({ name: "a", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/a/tsconfig.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@pkg-a/*": ["src/*"],
          },
        },
      },
      null,
      2,
    )}\n`,
  )
  writeFile(repoRoot, "packages/a/src/index.ts", "export const value = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/a/src/index.ts", "export const value = 2\n")
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

test("workspace discovery does not require pnpm-workspace.yaml", () => {
  const { repoRoot, baseRef } = createMonorepoFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.workspacePackages, [
      { packageRoot: "packages/a" },
      { packageRoot: "packages/b" },
    ])
    assert.deepEqual(repoContext.workspaceRoots, [
      ".",
      "packages/a",
      "packages/b",
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("tsconfig project references and path aliases are resolved", () => {
  const { repoRoot, baseRef } = createMonorepoFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.tsconfigProjects, [
      {
        configPath: "packages/a/tsconfig.json",
        references: ["packages/b/tsconfig.json"],
      },
      {
        configPath: "packages/b/tsconfig.json",
        references: [],
      },
      {
        configPath: "tsconfig.json",
        references: ["packages/a/tsconfig.json", "packages/b/tsconfig.json"],
      },
    ])
    assert.deepEqual(repoContext.pathAliases, {
      "@pkg-b/*": ["packages/b/src/*"],
    })
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("workspace discovery supports recursive ** workspace patterns", () => {
  const { repoRoot, baseRef } = createRecursiveWorkspaceFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.workspacePackages, [
      { packageRoot: "packages/a" },
      { packageRoot: "packages/nested/b" },
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("tsconfig discovery supports explicit absolute workspace roots", () => {
  const { repoRoot, baseRef } = createAbsoluteWorkspaceRootsFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
      workspaceRoots: [repoRoot, path.join(repoRoot, "packages/a")],
    })

    assert.deepEqual(repoContext.workspaceRoots, [".", "packages/a"])
    assert.deepEqual(repoContext.tsconfigProjects, [
      {
        configPath: "packages/a/tsconfig.json",
        references: [],
      },
      {
        configPath: "tsconfig.json",
        references: [],
      },
    ])
    assert.deepEqual(repoContext.pathAliases, {
      "@pkg-a/*": ["packages/a/src/*"],
    })
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
