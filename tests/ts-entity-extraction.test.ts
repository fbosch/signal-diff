import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { createTypeScriptExtractionResult } from "../packages/adapter-typescript/src/index.ts"
import { loadRepoContextFromGit } from "../packages/cli/src/index.ts"

function writeFile(
  repoRoot: string,
  relativePath: string,
  content: string,
): void {
  const absolutePath = path.join(repoRoot, relativePath)
  mkdirSync(path.dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, content, "utf8")
}

function runGit(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim()
}

function createEntityFixtureRepo(): {
  repoRoot: string
  baseRef: string
  middleRef: string
  headRef: string
} {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "signal-diff-entity-"))

  runGit(repoRoot, ["init", "-b", "master"])
  runGit(repoRoot, ["config", "user.email", "opencode@example.com"])
  runGit(repoRoot, ["config", "user.name", "OpenCode"])

  writeFile(
    repoRoot,
    "package.json",
    JSON.stringify({
      name: "entity-fixture",
      private: true,
      workspaces: ["packages/*"],
    }),
  )
  writeFile(
    repoRoot,
    "tsconfig.json",
    JSON.stringify({
      files: [],
      references: [{ path: "./packages/app" }],
    }),
  )
  writeFile(
    repoRoot,
    "packages/app/package.json",
    JSON.stringify({ name: "app", version: "1.0.0" }),
  )
  writeFile(
    repoRoot,
    "packages/app/tsconfig.json",
    JSON.stringify({
      compilerOptions: {
        composite: true,
        jsx: "react-jsx",
      },
      include: ["src/**/*.ts", "src/**/*.tsx"],
    }),
  )
  writeFile(
    repoRoot,
    "packages/app/src/view.tsx",
    [
      'import { readFileSync } from "node:fs"',
      "export interface UserContract {",
      "  id: string",
      "}",
      "",
      "export type UserId = string",
      "",
      "export class UserService {",
      "  cache = new Map<string, string>()",
      "",
      "  renderRow(user: UserContract) {",
      "    return <div>{user.id}</div>",
      "  }",
      "}",
      "",
      "export function helper(value: number): number {",
      "  return value + 1",
      "}",
      "",
      "export const add = (a: number, b: number): number => a + b",
      "",
      "export const UserView = () => <section>view</section>",
      "",
      "export const LegacyView = function LegacyView() {",
      "  return <aside>legacy</aside>",
      "}",
      "",
      "void readFileSync",
      "",
    ].join("\n"),
  )

  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "base"])
  const baseRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(
    repoRoot,
    "packages/app/src/view.tsx",
    [
      'import { readFileSync } from "node:fs"',
      'import path from "node:path"',
      "export interface UserContract {",
      "  id: string",
      "}",
      "",
      "export type UserId = string",
      "",
      "export class UserService {",
      "  cache = new Map<string, string>()",
      "",
      "  renderRow(user: UserContract) {",
      '    return <div className="row">{user.id}</div>',
      "  }",
      "}",
      "",
      "export function helper(value: number): number {",
      "  return value + 2",
      "}",
      "",
      "export const add = (a: number, b: number): number => a + b",
      "",
      "export const UserView = () => <section>updated</section>",
      "",
      "export const LegacyView = function LegacyView() {",
      "  return <aside>legacy-updated</aside>",
      "}",
      "",
      "void readFileSync",
      "void path",
      "",
    ].join("\n"),
  )

  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "middle"])
  const middleRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  writeFile(
    repoRoot,
    "packages/app/src/view.tsx",
    [
      'import { readFileSync } from "node:fs"',
      'import path from "node:path"',
      "import {",
      "  fileURLToPath,",
      '} from "node:url"',
      "export interface UserContract {",
      "  id: string",
      "}",
      "",
      "export type UserId = string",
      "",
      "export class UserService {",
      "  cache = new Map<string, string>()",
      "",
      "  renderRow(user: UserContract) {",
      "    const content = user.id.toUpperCase()",
      '    return <div className="row">{content}</div>',
      "  }",
      "}",
      "",
      "export function helper(value: number): number {",
      "  return value + 3",
      "}",
      "",
      "export const add = (a: number, b: number): number => a + b",
      "",
      "export const UserView = () => <section>updated-again</section>",
      "",
      "export const LegacyView = function LegacyView() {",
      "  return <aside>legacy-updated-again</aside>",
      "}",
      "",
      "void readFileSync",
      "void path",
      "void fileURLToPath",
      "",
    ].join("\n"),
  )

  runGit(repoRoot, ["add", "."])
  runGit(repoRoot, ["commit", "-m", "head"])
  const headRef = runGit(repoRoot, ["rev-parse", "HEAD"])

  return {
    repoRoot,
    baseRef,
    middleRef,
    headRef,
  }
}

test("typescript extraction emits canonical entity kinds from source constructs", () => {
  const { repoRoot, baseRef } = createEntityFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })
    const extraction = createTypeScriptExtractionResult({
      repoContext,
      format: "json",
      maxFindings: 20,
      includeDiffHunks: true,
    })

    const entityKinds = new Set(
      extraction.entities.map((entity) => entity.kind),
    )

    assert.equal(entityKinds.has("module"), true)
    assert.equal(entityKinds.has("function"), true)
    assert.equal(entityKinds.has("contract"), true)
    assert.equal(entityKinds.has("type_like_entity"), true)
    assert.equal(entityKinds.has("method"), true)
    assert.equal(entityKinds.has("field"), true)
    assert.equal(entityKinds.has("render_unit"), true)
    assert.equal(
      extraction.entities.some(
        (entity) => entity.kind === "function" && entity.name === "add",
      ),
      true,
    )
    assert.equal(
      extraction.entities.some(
        (entity) =>
          entity.kind === "render_unit" && entity.name === "LegacyView",
      ),
      true,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("typescript extraction keeps non-TS source changes in entity output", () => {
  const { repoRoot, baseRef } = createEntityFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: "HEAD",
    })

    repoContext.changedFiles = [{ path: "scripts/build.js", kind: "source" }]
    const extraction = createTypeScriptExtractionResult({
      repoContext,
      format: "json",
      maxFindings: 20,
      includeDiffHunks: false,
    })

    assert.equal(extraction.entities.length, 1)
    assert.equal(extraction.entities[0]?.modulePath, "scripts/build.js")
    assert.equal(extraction.entities[0]?.kind, "module")
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("canonical entity ids stay stable across semantic-preserving edits", () => {
  const { repoRoot, baseRef, middleRef, headRef } = createEntityFixtureRepo()

  try {
    const firstContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef: middleRef,
    })
    const secondContext = loadRepoContextFromGit({
      repoRoot,
      baseRef: middleRef,
      headRef,
    })
    const firstIds = new Set(
      createTypeScriptExtractionResult({
        repoContext: firstContext,
        format: "json",
        maxFindings: 20,
        includeDiffHunks: false,
      }).entities.map((entity) => entity.id),
    )
    const secondIds = new Set(
      createTypeScriptExtractionResult({
        repoContext: secondContext,
        format: "json",
        maxFindings: 20,
        includeDiffHunks: false,
      }).entities.map((entity) => entity.id),
    )

    assert.deepEqual([...firstIds].sort(), [...secondIds].sort())
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("typescript extraction computes module import fan-out deltas from base/head", () => {
  const { repoRoot, baseRef, headRef } = createEntityFixtureRepo()

  try {
    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef,
      headRef,
    })
    const extraction = createTypeScriptExtractionResult({
      repoContext,
      format: "json",
      maxFindings: 20,
      includeDiffHunks: false,
    })
    const moduleEntity = extraction.entities.find(
      (entity) =>
        entity.kind === "module" &&
        entity.modulePath === "packages/app/src/view.tsx",
    )

    assert.equal(moduleEntity !== undefined, true)

    const moduleChange = extraction.changes.find(
      (change) => change.entityId === moduleEntity?.id,
    )

    assert.equal(moduleChange !== undefined, true)
    assert.deepEqual(moduleChange?.featureDeltas.topology.importFanOut, {
      before: 1,
      after: 3,
    })
    assert.equal(
      moduleChange?.featureDeltas.summary.includes(
        "Module import fan-out changed 1 -> 3.",
      ),
      true,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("typescript extraction reports explicit fallback when module delta unavailable", () => {
  const { repoRoot, headRef } = createEntityFixtureRepo()

  try {
    writeFile(
      repoRoot,
      "packages/app/src/new-module.ts",
      [
        'import path from "node:path"',
        'export const normalized = path.normalize("x")',
      ].join("\n"),
    )
    runGit(repoRoot, ["add", "."])
    runGit(repoRoot, ["commit", "-m", "add module"])
    const newHeadRef = runGit(repoRoot, ["rev-parse", "HEAD"])

    const repoContext = loadRepoContextFromGit({
      repoRoot,
      baseRef: headRef,
      headRef: newHeadRef,
    })
    const extraction = createTypeScriptExtractionResult({
      repoContext,
      format: "json",
      maxFindings: 20,
      includeDiffHunks: false,
    })
    const addedModuleEntity = extraction.entities.find(
      (entity) =>
        entity.kind === "module" &&
        entity.modulePath === "packages/app/src/new-module.ts",
    )

    assert.equal(addedModuleEntity !== undefined, true)

    const addedModuleChange = extraction.changes.find(
      (change) => change.entityId === addedModuleEntity?.id,
    )

    assert.equal(addedModuleChange !== undefined, true)
    assert.equal(
      addedModuleChange?.featureDeltas.topology.importFanOut,
      undefined,
    )
    assert.equal(
      addedModuleChange?.featureDeltas.summary.includes(
        "Skipped topology.importFanOut delta because base/head module content was unavailable.",
      ),
      true,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
