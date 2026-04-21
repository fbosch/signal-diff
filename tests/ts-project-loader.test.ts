import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { loadTypeScriptProjectsFromRepoContext } from "../packages/adapter-typescript/src/index.ts"
import { loadRepoContextFromGit } from "../packages/cli/src/index.ts"

function writeFile(
  repoRoot: string,
  relativePath: string,
  content: string,
): void {
  mkdirSync(path.dirname(path.join(repoRoot, relativePath)), {
    recursive: true,
  })
  writeFileSync(path.join(repoRoot, relativePath), content, "utf8")
}

function runGit(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim()
}

function createTypeScriptLoaderFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "signal-diff-ts-loader-"))

  runGit(repoRoot, ["init"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])

  writeFile(
    repoRoot,
    "package.json",
    JSON.stringify({
      name: "fixture",
      private: true,
      workspaces: ["packages/*"],
    }),
  )
  writeFile(
    repoRoot,
    "tsconfig.json",
    JSON.stringify({
      files: [],
      references: [{ path: "./packages/a" }, { path: "./packages/b" }],
    }),
  )
  writeFile(
    repoRoot,
    "packages/a/package.json",
    JSON.stringify({ name: "a", version: "1.0.0" }),
  )
  writeFile(
    repoRoot,
    "packages/a/tsconfig.json",
    JSON.stringify({
      compilerOptions: { composite: true },
      include: ["src/**/*.ts"],
    }),
  )
  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 1\n")
  writeFile(repoRoot, "packages/a/src/helper.ts", "export const helper = 1\n")
  writeFile(
    repoRoot,
    "packages/b/package.json",
    JSON.stringify({ name: "b", version: "1.0.0" }),
  )
  writeFile(
    repoRoot,
    "packages/b/tsconfig.json",
    JSON.stringify({
      compilerOptions: { composite: true },
      include: ["src/**/*.ts"],
    }),
  )
  writeFile(repoRoot, "packages/b/src/index.ts", "export const b = 1\n")

  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 2\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

test("ts-morph loader resolves changed and adjacent monorepo files", () => {
  const { repoRoot, baseRef } = createTypeScriptLoaderFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })
    const loaded = loadTypeScriptProjectsFromRepoContext(repoContext)

    assert.equal(loaded.changedSourceFiles.length, 1)
    assert.equal(
      loaded.changedSourceFiles[0]
        ?.getFilePath()
        .endsWith("packages/a/src/index.ts"),
      true,
    )
    assert.equal(
      loaded.adjacentSourceFiles.some((sourceFile) =>
        sourceFile.getFilePath().endsWith("packages/a/src/helper.ts"),
      ),
      true,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("ts-morph loader does not treat changed siblings as adjacent files", () => {
  const { repoRoot, baseRef } = createTypeScriptLoaderFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    repoContext.changedFiles = [
      { path: "packages/a/src/index.ts", kind: "source" },
      { path: "packages/a/src/helper.ts", kind: "source" },
    ]

    const loaded = loadTypeScriptProjectsFromRepoContext(repoContext)

    assert.equal(loaded.changedSourceFiles.length, 2)
    assert.equal(loaded.adjacentSourceFiles.length, 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("ts-morph loader skips project loading when no TypeScript source changed", () => {
  const { repoRoot, baseRef } = createTypeScriptLoaderFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    repoContext.changedFiles = [{ path: "README.md", kind: "documentation" }]

    const loaded = loadTypeScriptProjectsFromRepoContext(repoContext)

    assert.equal(loaded.projects.length, 0)
    assert.equal(loaded.changedSourceFiles.length, 0)
    assert.equal(loaded.adjacentSourceFiles.length, 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("ts-morph loader fails loudly for unresolved tsconfig path", () => {
  const { repoRoot, baseRef } = createTypeScriptLoaderFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    repoContext.tsconfigProjects = [
      ...(repoContext.tsconfigProjects ?? []),
      { configPath: "packages/missing/tsconfig.json", references: [] },
    ]

    assert.throws(
      () => loadTypeScriptProjectsFromRepoContext(repoContext),
      /packages\/missing\/tsconfig\.json/,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("ts-morph loader fails loudly for unresolved changed source path", () => {
  const { repoRoot, baseRef } = createTypeScriptLoaderFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    repoContext.changedFiles = [
      { path: "packages/a/src/missing.ts", kind: "source" },
    ]

    assert.throws(
      () => loadTypeScriptProjectsFromRepoContext(repoContext),
      /packages\/a\/src\/missing\.ts/,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
