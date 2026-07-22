/**
 * TypeScript mirrors of base44/entities/*.jsonc — contract parity source.
 * Pushable schemas live in the sibling .jsonc files (Base44 CLI convention).
 */

/** HackathonState row shape (Phase 1 + Phase 2 Scope-Sniper fields) */
export interface HackathonStateRecord {
  id?: string;
  owner_id: string;
  session_id: string;
  current_focus_area: string;
  target_repo_url?: string;
  target_branch?: string;
  /** Unix ms hackathon end — Scope-Sniper */
  countdown_deadline?: number;
  /** In-scope MVP text blob */
  core_mvp_definition?: string;
  hours_remaining_cache?: number;
  scope_mode?: "strict" | "advisory";
  last_active_timestamp: number;
}

/** ActiveBlockers row — backs SynthesisStateStream */
export interface ActiveBlockersRecord {
  id?: string;
  owner_id: string;
  session_id: string;
  raw_transcript: string;
  parsed_issue?: string;
  context_tags?: string[];
  urgency_flag: boolean;
  assigned_agent?: string;
  status:
    | "parsing_intent"
    | "querying_docs"
    | "generating_logic"
    | "verifying_syntax";
  completion_percentage: number;
  current_focus?: string;
  latency_ms: number;
  is_resolved: boolean;
  /** Set when hacker overrides Scope-Sniper warning */
  scope_override?: boolean;
  telemetry_event?: string;
}

/** PhantomThreads step entry */
export interface PhantomThreadStep {
  id: string;
  label: string;
  status: string;
}

/** PhantomThreads row — background autonomous workers */
export interface PhantomThreadsRecord {
  id?: string;
  owner_id: string;
  session_id: string;
  parent_blocker_id: string;
  brief: string;
  status:
    | "queued"
    | "running"
    | "compiling"
    | "pushing"
    | "complete"
    | "failed";
  steps?: PhantomThreadStep[];
  completion_percentage: number;
  git_branch?: string;
  error_trace?: string;
  telemetry_event?: string;
  started_at: number;
  finished_at?: number;
}

/** Architecture graph node kinds */
export type ArchitectureNodeKind =
  | "deno_fn"
  | "entity"
  | "rls_policy"
  | "connector";

/** Architecture graph edge relations */
export type ArchitectureEdgeRelation =
  | "reads"
  | "writes"
  | "invokes"
  | "secures";

/** ArchitectureGraph node */
export interface ArchitectureGraphNode {
  id: string;
  kind: ArchitectureNodeKind;
  label: string;
  meta?: Record<string, unknown>;
}

/** ArchitectureGraph edge */
export interface ArchitectureGraphEdge {
  from: string;
  to: string;
  relation: ArchitectureEdgeRelation;
}

/**
 * ArchitectureGraph row — one active snapshot per session_id (upsert).
 * Soft UI budget: ≤ ~200 nodes / ~400 edges.
 */
export interface ArchitectureGraphRecord {
  id?: string;
  owner_id: string;
  session_id: string;
  generated_at: number;
  source_hash: string;
  nodes: ArchitectureGraphNode[];
  edges: ArchitectureGraphEdge[];
}

/** GeneratedSolutions row — backs ResolutionArtifact (+ Phantom merge) */
export interface GeneratedSolutionsRecord {
  id?: string;
  owner_id: string;
  blocker_reference: string;
  solution_type: "code_snippet" | "architecture_diagram" | "terminal_command";
  language: string;
  code: string;
  file_path?: string;
  neural_summary: string;
  available_actions: Array<"deploy" | "override" | "discard" | "merge">;
  has_been_committed: boolean;
  deployment_url?: string;
  is_discarded?: boolean;
  execution_mode?: "sync" | "phantom";
  phantom_thread_id?: string;
  git_branch?: string;
  merge_ready?: boolean;
  merge_status?: "pending" | "ready" | "merged" | "abandoned";
  eval_status?: "not_run" | "passing" | "failing";
  telemetry_event?: string;
}

/** Fields required by SynthesisStateStream on ActiveBlockers */
export const SYNTHESIS_STREAM_FIELDS = [
  "status",
  "completion_percentage",
  "current_focus",
  "latency_ms",
] as const;

/** Fields required by ResolutionArtifact on GeneratedSolutions */
export const RESOLUTION_ARTIFACT_FIELDS = [
  "blocker_reference",
  "solution_type",
  "language",
  "code",
  "file_path",
  "neural_summary",
  "available_actions",
] as const;

/** Soft caps for ArchitectureGraph payloads */
export const ARCHITECTURE_GRAPH_LIMITS = {
  maxNodes: 200,
  maxEdges: 400,
} as const;

/** Entity names registered with Base44 */
export const ENTITY_NAMES = [
  "HackathonState",
  "ActiveBlockers",
  "GeneratedSolutions",
  "PhantomThreads",
  "ArchitectureGraph",
] as const;
