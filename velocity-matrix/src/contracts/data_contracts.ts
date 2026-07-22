/**
 * Canonical TypeScript payloads between UI and Base44 backend.
 * Source of truth: agents/data-contracts.md + Phase 2.0 plans.
 * Must stay field-identical to base44/shared/contracts.ts.
 */

/** UI -> Base44: process-voice-command */
export interface VoiceIngestionPayload {
  /** Optional client hint — Node 01 forces owner_id from JWT, never trusts this */
  hacker_id?: string;
  session_id: string;
  timestamp_ms: number;
  transcript: string;
  context_tags?: string[];
  /** Client may omit — Node 01 derives from transcript keywords (B3) */
  urgency_flag?: boolean;
}

/** Base44 -> UI: voice command ack */
export interface VoiceIngestionResponse {
  status: "acknowledged" | "rejected";
  blocker_id: string;
  assigned_agent: string;
}

/** Base44 -> UI: ActiveBlockers row updates via WebSocket */
export interface SynthesisStateStream {
  blocker_id: string;
  status:
    | "parsing_intent"
    | "querying_docs"
    | "generating_logic"
    | "verifying_syntax";
  completion_percentage: number;
  current_focus: string;
  latency_ms: number;
}

/** Base44 -> UI: GeneratedSolutions insert via WebSocket */
export interface ResolutionArtifact {
  artifact_id: string;
  blocker_id: string;
  timestamp: string;
  solution_type: "code_snippet" | "architecture_diagram" | "terminal_command";
  payload: {
    language: string;
    code: string;
    file_path?: string;
  };
  neural_summary: string;
  available_actions: Array<"deploy" | "override" | "discard" | "merge">;
  execution_mode?: "sync" | "phantom";
  git_branch?: string;
  merge_ready?: boolean;
  eval_status?: "not_run" | "passing" | "failing";
}

/** UI -> Base44: execute-resolution */
export interface ExecutionPayload {
  artifact_id: string;
  action_taken: "deploy" | "override" | "discard" | "merge";
  modified_code?: string;
  target_connector: "github_auto_commit" | "cli_executor";
  commit_message?: string;
}

/** Base44 -> UI: execution outcome */
export interface ExecutionResult {
  success: boolean;
  deployment_url?: string;
  error_trace?: string;
}

/** UI -> Base44: provision-hackathon-state (optional onboarding fields) */
export interface ProvisionHackathonStatePayload {
  session_id?: string;
  current_focus_area?: string;
  target_repo_url?: string;
  countdown_deadline?: number;
  core_mvp_definition?: string;
  scope_mode?: "strict" | "advisory";
}

/** Base44 -> UI: Solo-Cell seed result */
export interface ProvisionHackathonStateResult {
  status: "created" | "exists" | "rejected";
  state_id: string;
  session_id: string;
  error_trace?: string;
}

/** Stable telemetry event types — FE Web Audio map keys these strings */
export type MatrixTelemetryEventType =
  | "PHANTOM_RUNNING"
  | "PHANTOM_COMPILING"
  | "SYNTHESIS_COMPLETE"
  | "EVALS_PASSED"
  | "EVALS_FAILED"
  | "MATRIX_DENIED"
  | "SCOPE_WARNING"
  | "BRANCH_READY";

/** Discriminated telemetry envelope for subscription bridges */
export type MatrixTelemetryEvent =
  | { type: "PHANTOM_RUNNING"; phantom_thread_id: string }
  | { type: "PHANTOM_COMPILING"; phantom_thread_id: string }
  | { type: "SYNTHESIS_COMPLETE"; blocker_id: string; artifact_id?: string }
  | { type: "EVALS_PASSED"; artifact_id: string }
  | { type: "EVALS_FAILED"; artifact_id: string; detail?: string }
  | { type: "MATRIX_DENIED"; entity?: string; message: string }
  | {
      type: "SCOPE_WARNING";
      blocker_id?: string;
      hours_remaining: number;
      warning_message: string;
      shortcut_suggestion?: string;
    }
  | { type: "BRANCH_READY"; artifact_id: string; git_branch: string };

/** UI -> Base44: spawn-phantom-thread */
export interface PhantomThreadSpawnPayload {
  blocker_id: string;
  brief: string;
  steps?: Array<{ id: string; label: string }>;
}

/** Base44 -> UI: PhantomThreads row stream */
export interface PhantomThreadStateStream {
  phantom_thread_id: string;
  status:
    | "queued"
    | "running"
    | "compiling"
    | "pushing"
    | "complete"
    | "failed";
  completion_percentage: number;
  steps: Array<{ id: string; label: string; status: string }>;
  git_branch?: string;
  error_trace?: string;
  telemetry_event?: MatrixTelemetryEventType;
}

/** Scope-Sniper grade from Synthesis Grid (Node 02) */
export interface ScopeGradeResult {
  friction_hours: number;
  within_mvp: boolean;
  warning_message: string;
  shortcut_suggestion?: string;
  hours_remaining?: number;
}

/** Architecture graph payload for Neural Blueprint canvas */
export interface ArchitectureGraphPayload {
  session_id: string;
  generated_at: number;
  source_hash: string;
  nodes: Array<{
    id: string;
    kind: "deno_fn" | "entity" | "rls_policy" | "connector";
    label: string;
    meta?: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    relation: "reads" | "writes" | "invokes" | "secures";
  }>;
}

/** Synthesis status enum shared with entity schema */
export type SynthesisStatus = SynthesisStateStream["status"];

/** Solution type enum shared with entity schema */
export type SolutionType = ResolutionArtifact["solution_type"];

/** Action enum shared with entity schema */
export type ArtifactAction = ResolutionArtifact["available_actions"][number];
