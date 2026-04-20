export type CanonicalEntityKind =
  | "module"
  | "function"
  | "method"
  | "contract"
  | "type_like_entity"
  | "field"
  | "render_unit"
  | "test_artifact"
  | "example_artifact"
  | "configuration_unit"

export type CanonicalRelationshipKind =
  | "contains"
  | "exports"
  | "imports"
  | "calls"
  | "uses_type"
  | "extends"
  | "implements"
  | "tests"
  | "constructs"

export type ChangeKind =
  | "entity_added"
  | "entity_removed"
  | "entity_modified"
  | "public_contract_changed"
  | "dependency_edge_added"
  | "dependency_edge_removed"
  | "control_flow_expanded"
  | "control_flow_reduced"
  | "fallback_behavior_changed"
  | "async_behavior_changed"
  | "side_effect_profile_changed"
  | "visibility_changed"

export type FindingKind =
  | "peer_divergence"
  | "likely_pattern_change"
  | "public_contract_drift"
  | "likely_new_abstraction"
  | "boundary_anomaly"
  | "likely_incomplete_companion_change"
  | "behavior_shift"
  | "elevated_review_priority"

export type ReviewPriority = "low" | "medium" | "high"
export type EntityVisibility = "public" | "internal" | "private" | "unknown"
export type InputCategory =
  | "none"
  | "positional"
  | "named"
  | "variadic"
  | "mixed"
export type OutputCategory =
  | "unknown"
  | "void"
  | "scalar"
  | "collection"
  | "object"
  | "renderable"
  | "promise"

export type AsyncBehavior = "sync" | "async"
export type SideEffectProfile = "none" | "low" | "medium" | "high"
export type FallbackBehavior =
  | "none"
  | "default_value"
  | "conditional_guard"
  | "try_catch"
  | "error_propagation"
  | "unknown"

export type ErrorHandlingStyle =
  | "none"
  | "throw"
  | "return_result"
  | "swallow"
  | "mixed"
  | "unknown"

export type OrchestrationLevel = "leaf" | "helper" | "orchestrator" | "unknown"
export type PublicRole =
  | "public"
  | "internal"
  | "test_only"
  | "example_only"
  | "unknown"
export type ChangedFileKind =
  | "source"
  | "test"
  | "example"
  | "configuration"
  | "documentation"
  | "unknown"

export type ReviewOutputFormat = "json" | "markdown"
export type ReviewStage =
  | "overview"
  | "finding_detail"
  | "evidence"
  | "raw_diff"

export interface SourceLocation {
  filePath: string
  startLine: number
  endLine: number
}

export interface DiffHunkReference {
  filePath: string
  baseStartLine: number
  baseLineCount: number
  headStartLine: number
  headLineCount: number
}

export interface SignatureFeatures {
  inputArity: number
  inputCategory: InputCategory
  outputCategory: OutputCategory
  hasOptionalInputs: boolean
  hasDefaultInputs: boolean
  visibility: EntityVisibility
  asyncBehavior: AsyncBehavior
}

export interface StructuralFeatures {
  branchCount: number
  hasTryCatch: boolean
  helperCallCount: number
  delegationLevel: number
  hasObjectConstruction: boolean
  isStateful: boolean
  hasRenderStructure: boolean
}

export interface BehavioralFeatures {
  sideEffectProfile: SideEffectProfile
  fallbackBehavior: FallbackBehavior
  errorHandlingStyle: ErrorHandlingStyle
  orchestrationLevel: OrchestrationLevel
  transformationDensity: number
}

export interface TopologyFeatures {
  containerPath: string
  packageName: string | null
  publicRole: PublicRole
  adjacentTestPaths: string[]
  adjacentExamplePaths: string[]
  importFanIn: number
  importFanOut: number
}

export interface CanonicalFeatures {
  signature: SignatureFeatures
  structural: StructuralFeatures
  behavioral: BehavioralFeatures
  topology: TopologyFeatures
}

export interface CanonicalEntity {
  id: string
  kind: CanonicalEntityKind
  name: string
  modulePath: string
  exported: boolean
  location: SourceLocation
  features: CanonicalFeatures
}

export interface CanonicalRelationship {
  id: string
  kind: CanonicalRelationshipKind
  fromEntityId: string
  toEntityId: string
}

export interface FeatureDelta<TValue> {
  before: TValue
  after: TValue
}

export interface FeatureDeltaSet {
  summary: string[]
  signature: Partial<{
    inputArity: FeatureDelta<number>
    inputCategory: FeatureDelta<InputCategory>
    outputCategory: FeatureDelta<OutputCategory>
    hasOptionalInputs: FeatureDelta<boolean>
    hasDefaultInputs: FeatureDelta<boolean>
    visibility: FeatureDelta<EntityVisibility>
    asyncBehavior: FeatureDelta<AsyncBehavior>
  }>
  structural: Partial<{
    branchCount: FeatureDelta<number>
    hasTryCatch: FeatureDelta<boolean>
    helperCallCount: FeatureDelta<number>
    delegationLevel: FeatureDelta<number>
    hasObjectConstruction: FeatureDelta<boolean>
    isStateful: FeatureDelta<boolean>
    hasRenderStructure: FeatureDelta<boolean>
  }>
  behavioral: Partial<{
    sideEffectProfile: FeatureDelta<SideEffectProfile>
    fallbackBehavior: FeatureDelta<FallbackBehavior>
    errorHandlingStyle: FeatureDelta<ErrorHandlingStyle>
    orchestrationLevel: FeatureDelta<OrchestrationLevel>
    transformationDensity: FeatureDelta<number>
  }>
  topology: Partial<{
    containerPath: FeatureDelta<string>
    packageName: FeatureDelta<string | null>
    publicRole: FeatureDelta<PublicRole>
    importFanIn: FeatureDelta<number>
    importFanOut: FeatureDelta<number>
  }>
}

export interface EntityChange {
  id: string
  entityId: string
  kind: ChangeKind
  summary: string
  featureDeltas: FeatureDeltaSet
}

export interface ReviewEvidence {
  id: string
  changedEntityIds: string[]
  relatedEntityIds: string[]
  peerAnchorEntityIds: string[]
  companionEntityIds: string[]
  relationshipIds: string[]
  changeIds: string[]
  diffHunks: DiffHunkReference[]
  supportingNotes: string[]
}

export interface ReviewFinding {
  id: string
  kind: FindingKind
  priority: ReviewPriority
  title: string
  description: string
  evidenceIds: string[]
}

export interface ReviewOverview {
  changedFileCount: number
  changedEntityCount: number
  topFindingCount: number
  highestPriorityFindings: string[]
}

export interface ReviewSurface {
  stageOrder: ReviewStage[]
  overview: ReviewOverview
  entities: CanonicalEntity[]
  relationships: CanonicalRelationship[]
  changes: EntityChange[]
  findings: ReviewFinding[]
  evidence: ReviewEvidence[]
  diffReferences: DiffHunkReference[]
}

export interface ChangedFile {
  path: string
  kind: ChangedFileKind
}

export interface WorkspacePackage {
  packageRoot: string
}

export interface TsconfigProject {
  configPath: string
  references: string[]
}

export interface RepoContext {
  repoRoot: string
  workspaceRoots: string[]
  baseRef: string
  headRef: string
  resolvedBaseRef?: string
  resolvedHeadRef?: string
  changedFiles: ChangedFile[]
  diffReferences?: DiffHunkReference[]
  workspacePackages?: WorkspacePackage[]
  tsconfigProjects?: TsconfigProject[]
  pathAliases?: Record<string, string[]>
}

export interface ReviewRequest {
  repoContext: RepoContext
  format: ReviewOutputFormat
  maxFindings: number
  includeDiffHunks: boolean
}

export interface ExtractionResult {
  repoContext: RepoContext
  entities: CanonicalEntity[]
  relationships: CanonicalRelationship[]
  changes: EntityChange[]
  diffReferences: DiffHunkReference[]
}

export interface ExtractionAdapter {
  language: string
  extract(request: ReviewRequest): Promise<ExtractionResult> | ExtractionResult
}

export interface HeuristicContext {
  repoContext: RepoContext
  entities: CanonicalEntity[]
  relationships: CanonicalRelationship[]
  changes: EntityChange[]
  diffReferences: DiffHunkReference[]
}

export interface Heuristic {
  id: string
  analyze(context: HeuristicContext): HeuristicResult
}

export interface HeuristicResult {
  findings: ReviewFinding[]
  evidence: ReviewEvidence[]
}

export interface ReportRenderer {
  format: ReviewOutputFormat
  render(reviewSurface: ReviewSurface): string
}

export interface ReviewPipeline {
  analyze(request: ReviewRequest): Promise<ReviewSurface> | ReviewSurface
}

export interface PackageBoundaryRule {
  packageName:
    | "core"
    | "adapter-typescript"
    | "heuristics"
    | "reporting"
    | "cli"
  allowedDependencies: string[]
  forbiddenNotes: string[]
}

export const REVIEW_STAGE_ORDER: ReviewStage[] = [
  "overview",
  "finding_detail",
  "evidence",
  "raw_diff",
]

export const PACKAGE_BOUNDARY_RULES: PackageBoundaryRule[] = [
  {
    packageName: "core",
    allowedDependencies: [],
    forbiddenNotes: [
      "No TypeScript compiler or ts-morph types in exported contracts.",
      "No adapter, heuristic, reporting, or CLI package dependencies.",
    ],
  },
  {
    packageName: "adapter-typescript",
    allowedDependencies: ["@signal-diff/core"],
    forbiddenNotes: [
      "Do not export TypeScript-specific compiler shapes to other packages.",
    ],
  },
  {
    packageName: "heuristics",
    allowedDependencies: ["@signal-diff/core"],
    forbiddenNotes: ["Do not depend on adapter internals or TS-only helpers."],
  },
  {
    packageName: "reporting",
    allowedDependencies: ["@signal-diff/core"],
    forbiddenNotes: ["Do not depend on adapter internals or TS-only helpers."],
  },
  {
    packageName: "cli",
    allowedDependencies: [
      "@signal-diff/core",
      "@signal-diff/adapter-typescript",
      "@signal-diff/heuristics",
      "@signal-diff/reporting",
    ],
    forbiddenNotes: [
      "Keep orchestration here; do not push CLI concerns into core.",
    ],
  },
]

export function createEmptyCanonicalFeatures(
  modulePath: string,
): CanonicalFeatures {
  return {
    signature: {
      inputArity: 0,
      inputCategory: "none",
      outputCategory: "unknown",
      hasOptionalInputs: false,
      hasDefaultInputs: false,
      visibility: "unknown",
      asyncBehavior: "sync",
    },
    structural: {
      branchCount: 0,
      hasTryCatch: false,
      helperCallCount: 0,
      delegationLevel: 0,
      hasObjectConstruction: false,
      isStateful: false,
      hasRenderStructure: false,
    },
    behavioral: {
      sideEffectProfile: "none",
      fallbackBehavior: "none",
      errorHandlingStyle: "none",
      orchestrationLevel: "unknown",
      transformationDensity: 0,
    },
    topology: {
      containerPath: modulePath,
      packageName: null,
      publicRole: "unknown",
      adjacentTestPaths: [],
      adjacentExamplePaths: [],
      importFanIn: 0,
      importFanOut: 0,
    },
  }
}

export function createEmptyReviewSurface(): ReviewSurface {
  return {
    stageOrder: REVIEW_STAGE_ORDER,
    overview: {
      changedFileCount: 0,
      changedEntityCount: 0,
      topFindingCount: 0,
      highestPriorityFindings: [],
    },
    entities: [],
    relationships: [],
    changes: [],
    findings: [],
    evidence: [],
    diffReferences: [],
  }
}

export function createReviewOverview(
  changedFileCount: number,
  changedEntityCount: number,
  findings: ReviewFinding[],
): ReviewOverview {
  const priorityOrder: ReviewPriority[] = ["high", "medium", "low"]
  const highestPriority = priorityOrder.find((priority) =>
    findings.some((finding) => finding.priority === priority),
  )

  return {
    changedFileCount,
    changedEntityCount,
    topFindingCount: findings.length,
    highestPriorityFindings:
      highestPriority === undefined
        ? []
        : findings
            .filter((finding) => finding.priority === highestPriority)
            .map((finding) => finding.id),
  }
}
