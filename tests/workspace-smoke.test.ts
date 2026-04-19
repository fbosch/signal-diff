import assert from "node:assert/strict"
import test from "node:test"

import { buildStubCliOutput } from "../packages/cli/src/index.ts"

test("workspace scaffold builds a cross-package stub review surface", () => {
  const output = buildStubCliOutput("packages/core/src/index.ts")
  const parsed = JSON.parse(output) as {
    entities: Array<{ id: string; kind: string }>
    findings: Array<{ id: string; evidenceEntityIds: string[] }>
  }

  assert.equal(parsed.entities.length, 1)
  assert.equal(parsed.entities[0]?.kind, "module")
  assert.equal(parsed.findings.length, 1)
  assert.deepEqual(parsed.findings[0]?.evidenceEntityIds, [
    "ts:packages/core/src/index.ts",
  ])
})
