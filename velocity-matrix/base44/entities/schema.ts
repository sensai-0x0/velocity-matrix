/**
 * TypeScript mirrors of base44/entities/*.jsonc — contract parity source.
 * Pushable schemas live in the sibling .jsonc files (Base44 CLI convention).
 */

/** HackathonState row shape */
export interface HackathonStateRecord {
  id?: string;
  owner_id: string;
  session_id: string;
  current_focus_area: string;
  target_repo_url?: string;
  target_branch?: string;
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
}

/** GeneratedSolutions row — backs ResolutionArtifact */
export interface GeneratedSolutionsRecord {
  id?: string;
  owner_id: string;
  blocker_reference: string;
  solution_type: "code_snippet" | "architecture_diagram" | "terminal_command";
  language: string;
  code: string;
  file_path?: string;
  neural_summary: string;
  available_actions: Array<"deploy" | "override" | "discard">;
  has_been_committed: boolean;
  deployment_url?: string;
  is_discarded?: boolean;
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

/** Entity names registered with Base44 */
export const ENTITY_NAMES = [
  "HackathonState",
  "ActiveBlockers",
  "GeneratedSolutions",
] as const;
