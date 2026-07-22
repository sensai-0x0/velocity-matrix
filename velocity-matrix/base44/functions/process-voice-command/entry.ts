/**
 * Node 01 — Ambient Cortex Ingestor (B3 hardened).
 * Endpoint: process-voice-command
 * Accepts VoiceIngestionPayload, inserts ActiveBlockers, returns VoiceIngestionResponse.
 *
 * Session continuity: multiple blockers share the client session_id —
 * we never invent a new session per utterance (AGENTS.md / auth Solo-Cell).
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import type {
  VoiceIngestionPayload,
  VoiceIngestionResponse,
} from "../../shared/contracts.ts";
import {
  mergeContextTags,
  resolveUrgency,
} from "../../shared/ingest.ts";

const ASSIGNED_AGENT = "llm_reasoning_core";

/**
 * Validate required VoiceIngestionPayload fields.
 * urgency_flag may be omitted — server derives from transcript (B3).
 * hacker_id is ignored if present (JWT owner_id only).
 */
function isValidPayload(
  body: unknown,
): body is Omit<VoiceIngestionPayload, "urgency_flag"> & {
  urgency_flag?: boolean;
} {
  if (!body || typeof body !== "object") return false;
  const p = body as Record<string, unknown>;
  const urgencyOk =
    p.urgency_flag === undefined || typeof p.urgency_flag === "boolean";
  return (
    typeof p.session_id === "string" &&
    p.session_id.length > 0 &&
    typeof p.timestamp_ms === "number" &&
    Number.isFinite(p.timestamp_ms) &&
    typeof p.transcript === "string" &&
    p.transcript.trim().length > 0 &&
    urgencyOk
  );
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user?.id) {
      const rejected: VoiceIngestionResponse = {
        status: "rejected",
        blocker_id: "",
        assigned_agent: "",
      };
      return Response.json(rejected, { status: 200 });
    }

    const body = await req.json();
    if (!isValidPayload(body)) {
      const rejected: VoiceIngestionResponse = {
        status: "rejected",
        blocker_id: "",
        assigned_agent: "",
      };
      return Response.json(rejected, { status: 200 });
    }

    const transcript = body.transcript.trim();
    // Rule A: never persist client hacker_id — owner_id from JWT only
    const contextTags = mergeContextTags(transcript, body.context_tags);
    const urgencyFlag = resolveUrgency(transcript, body.urgency_flag);

    const blocker = await base44.entities.ActiveBlockers.create({
      owner_id: user.id,
      session_id: body.session_id,
      raw_transcript: transcript,
      context_tags: contextTags,
      urgency_flag: urgencyFlag,
      assigned_agent: ASSIGNED_AGENT,
      status: "parsing_intent",
      completion_percentage: 0,
      current_focus: "Queued for synthesis…",
      latency_ms: 0,
      is_resolved: false,
    });

    const blockerId = blocker.id as string;

    // Dual-path (temporary): fire-and-forget Node 02 until entity automation is proven in deploy.
    // Canonical path is ActiveBlockers INSERT automation on synthesize-solution/function.jsonc.
    void base44.functions
      .invoke("synthesize-solution", { blocker_id: blockerId })
      .catch((err: unknown) => {
        console.warn(
          "[process-voice-command] synthesize invoke failed (automation may still run)",
          err,
        );
      });

    const response: VoiceIngestionResponse = {
      status: "acknowledged",
      blocker_id: blockerId,
      assigned_agent: ASSIGNED_AGENT,
    };
    return Response.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[process-voice-command]", message);
    const rejected: VoiceIngestionResponse = {
      status: "rejected",
      blocker_id: "",
      assigned_agent: "",
    };
    return Response.json(rejected, { status: 200 });
  }
});
