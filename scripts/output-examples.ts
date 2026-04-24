import process from "node:process"
import { buildStubReviewSurfaceFromRequest } from "../packages/cli/src/index.ts"
import type {
  ChangedFile,
  DiffHunkReference,
  ReviewRequest,
} from "../packages/core/src/index.ts"
import { createReviewJsonReportV1 } from "../packages/reporting/src/index.ts"

type ExampleProfile = "small" | "medium" | "large"

interface CliOptions {
  profile: ExampleProfile | "all"
  json: boolean
}

const PROFILE_ORDER: ExampleProfile[] = ["small", "medium", "large"]

function parseOptions(argv: string[]): CliOptions {
  let profile: ExampleProfile | "all" = "all"
  let json = false

  for (const argument of argv) {
    if (argument === "--json") {
      json = true
      continue
    }

    if (argument.startsWith("--profile=")) {
      const rawProfile = argument.slice("--profile=".length)

      if (rawProfile === "all") {
        profile = "all"
        continue
      }

      if (
        rawProfile === "small" ||
        rawProfile === "medium" ||
        rawProfile === "large"
      ) {
        profile = rawProfile
        continue
      }

      throw new Error(
        `Unknown profile '${rawProfile}'. Use one of: small, medium, large, all.`,
      )
    }

    throw new Error(`Unknown argument '${argument}'.`)
  }

  return { profile, json }
}

function createDiffReferences(
  changedFiles: ChangedFile[],
): DiffHunkReference[] {
  return changedFiles.map((file, index) => ({
    filePath: file.path,
    baseStartLine: index + 1,
    baseLineCount: 2,
    headStartLine: index + 1,
    headLineCount: 2,
  }))
}

function createRequest(profile: ExampleProfile): ReviewRequest {
  if (profile === "small") {
    const changedFiles: ChangedFile[] = [
      {
        path: "packages/app/src/math.ts",
        kind: "source",
      },
    ]

    return {
      repoContext: {
        repoRoot: "/repo",
        workspaceRoots: ["/repo"],
        baseRef: "origin/master",
        headRef: "HEAD",
        changedFiles,
        diffReferences: createDiffReferences(changedFiles),
        tsconfigProjects: [
          {
            configPath: "tsconfig.json",
            references: [],
          },
        ],
      },
      format: "json",
      maxFindings: 20,
      includeDiffHunks: true,
    }
  }

  if (profile === "medium") {
    const changedFiles: ChangedFile[] = [
      {
        path: "packages/core/src/index.ts",
        kind: "source",
      },
      {
        path: "packages/heuristics/src/rules.ts",
        kind: "source",
      },
      {
        path: "packages/cli/src/index.ts",
        kind: "source",
      },
      {
        path: "packages/core/test/smoke.test.ts",
        kind: "test",
      },
      {
        path: "docs/spec.md",
        kind: "documentation",
      },
      {
        path: "pnpm-workspace.yaml",
        kind: "configuration",
      },
    ]

    return {
      repoContext: {
        repoRoot: "/repo",
        workspaceRoots: ["/repo", "/repo/packages/core", "/repo/packages/cli"],
        baseRef: "origin/master",
        headRef: "HEAD",
        changedFiles,
        diffReferences: createDiffReferences(changedFiles),
        workspacePackages: [
          { packageRoot: "packages/core" },
          { packageRoot: "packages/heuristics" },
          { packageRoot: "packages/cli" },
        ],
        tsconfigProjects: [
          {
            configPath: "tsconfig.json",
            references: [
              "packages/core/tsconfig.json",
              "packages/heuristics/tsconfig.json",
              "packages/cli/tsconfig.json",
            ],
          },
          {
            configPath: "packages/core/tsconfig.json",
            references: [],
          },
        ],
      },
      format: "json",
      maxFindings: 25,
      includeDiffHunks: true,
    }
  }

  const changedFiles: ChangedFile[] = [
    { path: "packages/core/src/index.ts", kind: "source" },
    { path: "packages/core/src/graph.ts", kind: "source" },
    { path: "packages/core/src/contracts.ts", kind: "source" },
    { path: "packages/adapter-typescript/src/index.ts", kind: "source" },
    { path: "packages/adapter-typescript/src/loader.ts", kind: "source" },
    { path: "packages/adapter-typescript/src/types.ts", kind: "source" },
    { path: "packages/heuristics/src/index.ts", kind: "source" },
    { path: "packages/heuristics/src/rule-engine.ts", kind: "source" },
    { path: "packages/heuristics/src/evidence.ts", kind: "source" },
    { path: "packages/reporting/src/index.ts", kind: "source" },
    { path: "packages/cli/src/index.ts", kind: "source" },
    { path: "packages/cli/src/git.ts", kind: "source" },
    { path: "packages/core/test/contracts.test.ts", kind: "test" },
    {
      path: "packages/adapter-typescript/test/extraction.test.ts",
      kind: "test",
    },
    { path: "docs/SPEC.md", kind: "documentation" },
    { path: "docs/ADR-001.md", kind: "documentation" },
    { path: ".github/workflows/ci.yml", kind: "configuration" },
    { path: "pnpm-lock.yaml", kind: "configuration" },
  ]

  return {
    repoContext: {
      repoRoot: "/repo",
      workspaceRoots: [
        "/repo",
        "/repo/packages/core",
        "/repo/packages/adapter-typescript",
        "/repo/packages/heuristics",
        "/repo/packages/reporting",
        "/repo/packages/cli",
      ],
      baseRef: "origin/master",
      headRef: "HEAD",
      changedFiles,
      diffReferences: createDiffReferences(changedFiles),
      workspacePackages: [
        { packageRoot: "packages/core" },
        { packageRoot: "packages/adapter-typescript" },
        { packageRoot: "packages/heuristics" },
        { packageRoot: "packages/reporting" },
        { packageRoot: "packages/cli" },
      ],
      tsconfigProjects: [
        {
          configPath: "tsconfig.json",
          references: [
            "packages/core/tsconfig.json",
            "packages/adapter-typescript/tsconfig.json",
            "packages/heuristics/tsconfig.json",
            "packages/reporting/tsconfig.json",
            "packages/cli/tsconfig.json",
          ],
        },
        {
          configPath: "packages/adapter-typescript/tsconfig.json",
          references: ["packages/core/tsconfig.json"],
        },
        {
          configPath: "packages/cli/tsconfig.json",
          references: [
            "packages/core/tsconfig.json",
            "packages/adapter-typescript/tsconfig.json",
            "packages/heuristics/tsconfig.json",
            "packages/reporting/tsconfig.json",
          ],
        },
      ],
    },
    format: "json",
    maxFindings: 40,
    includeDiffHunks: true,
  }
}

function renderSummary(profile: ExampleProfile): string {
  const report = createReviewJsonReportV1(
    buildStubReviewSurfaceFromRequest(createRequest(profile)),
  )
  const topFinding = report.summary.top_finding_ids[0] ?? "none"

  return [
    `${profile}:`,
    `  changed_file_count=${report.summary.changed_file_count}`,
    `  changed_entity_count=${report.summary.changed_entity_count}`,
    `  finding_count=${report.summary.finding_count}`,
    `  top_finding=${topFinding}`,
  ].join("\n")
}

function renderJson(profile: ExampleProfile): string {
  const report = createReviewJsonReportV1(
    buildStubReviewSurfaceFromRequest(createRequest(profile)),
  )

  return JSON.stringify(report, null, 2)
}

function main(): void {
  const options = parseOptions(process.argv.slice(2))
  const profiles =
    options.profile === "all"
      ? PROFILE_ORDER
      : PROFILE_ORDER.filter((profile) => profile === options.profile)

  const outputs = profiles.map((profile) => {
    if (options.json) {
      return `# ${profile}\n${renderJson(profile)}`
    }

    return renderSummary(profile)
  })

  process.stdout.write(`${outputs.join("\n\n")}\n`)
}

main()
