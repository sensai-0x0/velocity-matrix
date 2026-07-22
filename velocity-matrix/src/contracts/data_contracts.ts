/**
 * Canonical TypeScript payloads between UI and Base44 backend.
 * Source of truth: agents/data-contracts.md
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
  available_actions: Array<"deploy" | "override" | "discard">;
}

/** UI -> Base44: execute-resolution */
export interface ExecutionPayload {
  artifact_id: string;
  action_taken: "deploy" | "override" | "discard";
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
}

/** Base44 -> UI: Solo-Cell seed result */
export interface ProvisionHackathonStateResult {
  status: "created" | "exists" | "rejected";
  state_id: string;
  session_id: string;
  error_trace?: string;
}

/** Synthesis status enum shared with entity schema */
export type SynthesisStatus = SynthesisStateStream["status"];

/** Solution type enum shared with entity schema */
export type SolutionType = ResolutionArtifact["solution_type"];

/** Action enum shared with entity schema */
export type ArtifactAction = ResolutionArtifact["available_actions"][number];
