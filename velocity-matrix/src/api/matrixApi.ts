/**
 * Typed Base44 function invokes for Node 01 / Node 03 UI contracts.
 * Always runs under the hacker's SDK session (RLS forwarding).
 */
import { base44 } from "@/api/base44Client";
import { getOrCreateSessionId } from "@/lib/ensureHackathonState";
import type {
  ArchitectureGraphPayload,
  ExecutionPayload,
  ExecutionResult,
  PhantomThreadSpawnPayload,
  ProvisionHackathonStatePayload,
  ProvisionHackathonStateResult,
  VoiceIngestionPayload,
  VoiceIngestionResponse,
} from "@/contracts/data_contracts";

export { getOrCreateSessionId };

const URGENT_RE = /\b(urgent|blocker|critical|asap|emergency)\b/i;

/** Build a VoiceIngestionPayload from STT / textarea input */
export function buildVoiceIngestionPayload(
  transcript: string,
  options?: {
    hackerId?: string;
    contextTags?: string[];
    urgencyFlag?: boolean;
  },
): VoiceIngestionPayload {
  const trimmed = transcript.trim();
  return {
    ...(options?.hackerId ? { hacker_id: options.hackerId } : {}),
    session_id: getOrCreateSessionId(),
    timestamp_ms: Date.now(),
    transcript: trimmed,
    ...(options?.contextTags?.length
      ? { context_tags: options.contextTags }
      : {}),
    urgency_flag:
      options?.urgencyFlag ?? URGENT_RE.test(trimmed),
  };
}

/** B2 — provision Solo-Cell HackathonState (idempotent) */
export async function provisionHackathonState(
  payload: ProvisionHackathonStatePayload = {},
): Promise<ProvisionHackathonStateResult> {
  const result = await base44.functions.invoke(
    "provision-hackathon-state",
    payload,
  );
  return unwrapInvoke<ProvisionHackathonStateResult>(result);
}

/** Node 01 — process-voice-command */
export async function processVoiceCommand(
  payload: VoiceIngestionPayload,
): Promise<VoiceIngestionResponse> {
  const result = await base44.functions.invoke(
    "process-voice-command",
    payload,
  );
  return unwrapInvoke<VoiceIngestionResponse>(result);
}

/** Node 03 — execute-resolution (Deploy / Override / Discard) */
export async function executeResolution(
  payload: ExecutionPayload,
): Promise<ExecutionResult> {
  const result = await base44.functions.invoke("execute-resolution", payload);
  return unwrapInvoke<ExecutionResult>(result);
}

/** Base44 invoke often wraps the function body under `.data` */
function unwrapInvoke<T>(result: unknown): T {
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: T }).data;
  }
  return result as T;
}

/** Convenience: deploy/override/discard/merge with github_auto_commit default */
export async function executeArtifactAction(
  artifactId: string,
  action: ExecutionPayload["action_taken"],
  options?: {
    modifiedCode?: string;
    commitMessage?: string;
    targetConnector?: ExecutionPayload["target_connector"];
  },
): Promise<ExecutionResult> {
  return executeResolution({
    artifact_id: artifactId,
    action_taken: action,
    target_connector: options?.targetConnector ?? "github_auto_commit",
    ...(options?.modifiedCode ? { modified_code: options.modifiedCode } : {}),
    ...(options?.commitMessage
      ? { commit_message: options.commitMessage }
      : {}),
  });
}

/** Phase 2 — spawn phantom thread */
export async function spawnPhantomThread(
  payload: PhantomThreadSpawnPayload,
): Promise<unknown> {
  const result = await base44.functions.invoke("spawn-phantom-thread", payload);
  return unwrapInvoke(result);
}

/** Phase 2 — build / refresh architecture graph */
export async function buildArchitectureGraph(payload?: {
  session_id?: string;
  force_refresh?: boolean;
}): Promise<{ status: string; graph?: ArchitectureGraphPayload }> {
  const result = await base44.functions.invoke(
    "build-architecture-graph",
    payload ?? {},
  );
  return unwrapInvoke(result);
}
