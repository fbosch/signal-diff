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

function createPnpmWorkspaceParsingFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "signal-diff-pnpm-parse-"),
  )

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "pnpm-parse-fixture",
        private: true,
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "pnpm-workspace.yaml",
    [
      "packages:",
      '  - "packages/*" # quoted with comment',
      "  - 'apps/*'",
      "onlyBuiltDependencies:",
      "  - esbuild",
      "",
    ].join("\n"),
  )
  writeFile(
    repoRoot,
    "packages/a/package.json",
    `${JSON.stringify({ name: "a", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "apps/web/package.json",
    `${JSON.stringify({ name: "web", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/a/tsconfig.json",
    `${JSON.stringify({ compilerOptions: {} }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "apps/web/tsconfig.json",
    `${JSON.stringify({ compilerOptions: {} }, null, 2)}\n`,
  )
  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 1\n")
  writeFile(repoRoot, "apps/web/src/index.ts", "export const web = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 2\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

function createInvalidPackageJsonWorkspaceFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "signal-diff-invalid-pkg-"),
  )

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(repoRoot, "package.json", "{ invalid json\n")
  writeFile(
    repoRoot,
    "pnpm-workspace.yaml",
    ["packages:", "  - packages/*", ""].join("\n"),
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
    `${JSON.stringify({ compilerOptions: {} }, null, 2)}\n`,
  )
  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 2\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

function createExtendsAliasFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "signal-diff-extends-"))

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "extends-alias-fixture",
        private: true,
        workspaces: ["packages/*"],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "tsconfig.base.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@core/*": ["packages/core/src/*"],
          },
        },
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
        references: [{ path: "./packages/cli" }],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "packages/cli/package.json",
    `${JSON.stringify({ name: "cli", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/cli/tsconfig.json",
    `${JSON.stringify(
      {
        extends: "../../tsconfig.base.json",
        compilerOptions: {},
      },
      null,
      2,
    )}\n`,
  )
  writeFile(repoRoot, "packages/cli/src/index.ts", "export const cli = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/cli/src/index.ts", "export const cli = 2\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

function createMissingReferenceFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "signal-diff-missing-ref-"),
  )

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "missing-ref-fixture",
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
        references: [
          { path: "./packages/app" },
          { path: "./packages/missing" },
        ],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "packages/app/package.json",
    `${JSON.stringify({ name: "app", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/app/tsconfig.json",
    `${JSON.stringify({ compilerOptions: {} }, null, 2)}\n`,
  )
  writeFile(repoRoot, "packages/app/src/index.ts", "export const app = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/app/src/index.ts", "export const app = 2\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

function createJsoncPackageExtendsFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "signal-diff-jsonc-extends-"),
  )

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "jsonc-extends-fixture",
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
        references: [{ path: "./packages/app" }],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "packages/app/package.json",
    `${JSON.stringify({ name: "app", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "node_modules/@tsconfig/node20/package.json",
    `${JSON.stringify(
      {
        name: "@tsconfig/node20",
        version: "0.0.0",
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "node_modules/@tsconfig/node20/tsconfig.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@from-package/*": ["types/*"],
          },
        },
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "packages/app/tsconfig.json",
    [
      "{",
      "  // JSONC comment should parse",
      '  "extends": "@tsconfig/node20/tsconfig.json",',
      '  "compilerOptions": {',
      '    "paths": {',
      '      "@app/*": ["src/*"],',
      "    },",
      "  },",
      "}",
      "",
    ].join("\n"),
  )
  writeFile(repoRoot, "packages/app/src/index.ts", "export const app = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/app/src/index.ts", "export const app = 2\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

function createArrayExtendsFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "signal-diff-array-extends-"),
  )

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "array-extends-fixture",
        private: true,
        workspaces: ["packages/*"],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "tsconfig.paths-a.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@from-a/*": ["packages/a/src/*"],
          },
        },
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "tsconfig.paths-b.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@from-b/*": ["packages/b/src/*"],
          },
        },
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
        references: [{ path: "./packages/app" }],
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "packages/app/package.json",
    `${JSON.stringify({ name: "app", version: "0.0.0" }, null, 2)}\n`,
  )
  writeFile(
    repoRoot,
    "packages/app/tsconfig.json",
    `${JSON.stringify(
      {
        extends: ["../../tsconfig.paths-a.json", "../../tsconfig.paths-b.json"],
        compilerOptions: {},
      },
      null,
      2,
    )}\n`,
  )
  writeFile(repoRoot, "packages/app/src/index.ts", "export const app = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/app/src/index.ts", "export const app = 2\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])

  return { repoRoot, baseRef }
}

function createConflictingAliasFixtureRepo(): {
  repoRoot: string
  baseRef: string
} {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "signal-diff-conflicting-alias-"),
  )

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])

  writeFile(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "conflicting-alias-fixture",
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
            "@/*": ["src/*"],
          },
        },
      },
      null,
      2,
    )}\n`,
  )
  writeFile(
    repoRoot,
    "packages/b/tsconfig.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["lib/*"],
          },
        },
      },
      null,
      2,
    )}\n`,
  )
  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 1\n")
  writeFile(repoRoot, "packages/b/lib/index.ts", "export const b = 1\n")
  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])

  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(repoRoot, "packages/a/src/index.ts", "export const a = 2\n")
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
        baseUrl: "packages/a",
        pathAliases: {
          "@pkg-b/*": ["packages/b/src/*"],
        },
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
        baseUrl: "packages/a",
        pathAliases: {
          "@pkg-a/*": ["packages/a/src/*"],
        },
      },
      {
        configPath: "tsconfig.json",
        references: [],
      },
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("pnpm workspace parsing only reads packages entries", () => {
  const { repoRoot, baseRef } = createPnpmWorkspaceParsingFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.workspacePackages, [
      { packageRoot: "apps/web" },
      { packageRoot: "packages/a" },
    ])
    assert.deepEqual(repoContext.workspaceRoots, [
      ".",
      "apps/web",
      "packages/a",
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("workspace discovery tolerates invalid package.json", () => {
  const { repoRoot, baseRef } = createInvalidPackageJsonWorkspaceFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.workspacePackages, [
      { packageRoot: "packages/a" },
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("path aliases inherit from tsconfig extends chain", () => {
  const { repoRoot, baseRef } = createExtendsAliasFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.tsconfigProjects, [
      {
        configPath: "packages/cli/tsconfig.json",
        references: [],
        baseUrl: ".",
        pathAliases: {
          "@core/*": ["packages/core/src/*"],
        },
      },
      {
        configPath: "tsconfig.json",
        references: ["packages/cli/tsconfig.json"],
      },
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("tsconfig parsing handles JSONC and package extends", () => {
  const { repoRoot, baseRef } = createJsoncPackageExtendsFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.tsconfigProjects, [
      {
        configPath: "packages/app/tsconfig.json",
        references: [],
        baseUrl: "node_modules/@tsconfig/node20",
        pathAliases: {
          "@app/*": ["node_modules/@tsconfig/node20/src/*"],
        },
      },
      {
        configPath: "tsconfig.json",
        references: ["packages/app/tsconfig.json"],
      },
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("tsconfig parsing supports array extends resolution", () => {
  const { repoRoot, baseRef } = createArrayExtendsFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.tsconfigProjects, [
      {
        configPath: "packages/app/tsconfig.json",
        references: [],
        baseUrl: ".",
        pathAliases: {
          "@from-b/*": ["packages/b/src/*"],
        },
      },
      {
        configPath: "tsconfig.json",
        references: ["packages/app/tsconfig.json"],
      },
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("conflicting aliases stay scoped per tsconfig project", () => {
  const { repoRoot, baseRef } = createConflictingAliasFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.tsconfigProjects, [
      {
        configPath: "packages/a/tsconfig.json",
        references: [],
        baseUrl: "packages/a",
        pathAliases: {
          "@/*": ["packages/a/src/*"],
        },
      },
      {
        configPath: "packages/b/tsconfig.json",
        references: [],
        baseUrl: "packages/b",
        pathAliases: {
          "@/*": ["packages/b/lib/*"],
        },
      },
      {
        configPath: "tsconfig.json",
        references: ["packages/a/tsconfig.json", "packages/b/tsconfig.json"],
      },
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("missing tsconfig references are not included in project graph", () => {
  const { repoRoot, baseRef } = createMissingReferenceFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    assert.deepEqual(repoContext.tsconfigProjects, [
      {
        configPath: "packages/app/tsconfig.json",
        references: [],
      },
      {
        configPath: "tsconfig.json",
        references: ["packages/app/tsconfig.json"],
      },
    ])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
