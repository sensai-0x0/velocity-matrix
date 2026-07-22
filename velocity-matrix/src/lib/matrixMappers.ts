/**
 * Map entity rows ↔ UI contracts for realtime subscriptions (F3).
 */
import type {
  ResolutionArtifact,
  SynthesisStateStream,
  SynthesisStatus,
} from "@/contracts/data_contracts";

/** ActiveBlockers row shape from Base44 realtime events */
export interface ActiveBlockerRow {
  id?: string;
  raw_transcript?: string;
  parsed_issue?: string;
  is_resolved?: boolean;
  status?: string;
  completion_percentage?: number;
  current_focus?: string;
  latency_ms?: number;
  urgency_flag?: boolean;
  assigned_agent?: string;
  telemetry_event?: string;
  scope_override?: boolean;
}

/** GeneratedSolutions row shape from Base44 realtime events */
export interface GeneratedSolutionRow {
  id?: string;
  blocker_reference?: string;
  solution_type?: ResolutionArtifact["solution_type"];
  language?: string;
  code?: string;
  file_path?: string;
  neural_summary?: string;
  available_actions?: ResolutionArtifact["available_actions"];
  has_been_committed?: boolean;
  deployment_url?: string;
  is_discarded?: boolean;
  created_date?: string;
  execution_mode?: "sync" | "phantom";
  git_branch?: string;
  merge_ready?: boolean;
  eval_status?: "not_run" | "passing" | "failing";
  telemetry_event?: string;
}

const SYNTHESIS_STATUSES: SynthesisStatus[] = [
  "parsing_intent",
  "querying_docs",
  "generating_logic",
  "verifying_syntax",
];

/** Build SynthesisStateStream from an ActiveBlockers row */
export function toSynthesisStream(
  row: ActiveBlockerRow,
  fallbackId: string,
): SynthesisStateStream {
  const status = SYNTHESIS_STATUSES.includes(row.status as SynthesisStatus)
    ? (row.status as SynthesisStatus)
    : "parsing_intent";

  return {
    blocker_id: (row.id as string | undefined) ?? fallbackId,
    status,
    completion_percentage: Number(row.completion_percentage ?? 0),
    current_focus: row.current_focus ?? "",
    latency_ms: Number(row.latency_ms ?? 0),
  };
}

/** Build ResolutionArtifact from a GeneratedSolutions row */
export function toResolutionArtifact(
  row: GeneratedSolutionRow,
  fallbackId: string,
  timestamp: string,
): ResolutionArtifact {
  return {
    artifact_id: (row.id as string | undefined) ?? fallbackId,
    blocker_id: row.blocker_reference ?? "",
    timestamp,
    solution_type: row.solution_type ?? "code_snippet",
    payload: {
      language: row.language ?? "typescript",
      code: row.code ?? "",
      ...(row.file_path ? { file_path: row.file_path } : {}),
    },
    neural_summary: row.neural_summary ?? "",
    available_actions: row.available_actions ?? ["deploy", "override", "discard"],
    ...(row.execution_mode ? { execution_mode: row.execution_mode } : {}),
    ...(row.git_branch ? { git_branch: row.git_branch } : {}),
    ...(row.merge_ready != null ? { merge_ready: row.merge_ready } : {}),
    ...(row.eval_status ? { eval_status: row.eval_status } : {}),
  };
}

/** Stage label for Synthesis Grid (F5 will refine; F3 surfaces stream focus) */
export function synthesisStageLabel(status: SynthesisStatus): string {
  switch (status) {
    case "parsing_intent":
      return ">> PARSING_INTENT...";
    case "querying_docs":
      return ">> SCANNING_CONNECTORS...";
    case "generating_logic":
      return ">> SYNTHESIZING_ARCHITECTURE...";
    case "verifying_syntax":
      return ">> VERIFYING_SYNTAX...";
    default:
      return ">> SYNTHESIZING...";
  }
}

/** Upsert by id at the front of a list */
export function upsertFront<T extends { id?: string }>(
  prev: T[],
  row: T,
  id: string,
): T[] {
  const withId = { ...row, id: row.id ?? id };
  return [withId, ...prev.filter((item) => item.id !== id)];
}

/** True when Node 02 timed out / queued for retry */
export function isDegradedBlocker(row: ActiveBlockerRow | null | undefined): boolean {
  if (!row) return false;
  const focus = row.current_focus ?? "";
  const issue = row.parsed_issue ?? "";
  return (
    /queued for retry|degraded|limit_cooldown|cooldown/i.test(focus) ||
    /^Degraded:/i.test(issue)
  );
}

/** True when silent failure left a crimson Failed Node */
export function isFailedBlocker(row: ActiveBlockerRow | null | undefined): boolean {
  if (!row) return false;
  return (
    row.is_resolved === false &&
    /^System Error:/i.test(row.parsed_issue ?? "")
  );
}

