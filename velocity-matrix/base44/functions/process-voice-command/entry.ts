/**
 * Node 01 — Ambient Cortex Ingestor
 * Endpoint: process-voice-command
 * Accepts VoiceIngestionPayload, inserts ActiveBlockers, returns VoiceIngestionResponse.
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import type {
  VoiceIngestionPayload,
  VoiceIngestionResponse,
} from "../../shared/contracts.ts";

const ASSIGNED_AGENT = "llm_reasoning_core";

/** Validate required VoiceIngestionPayload fields */
function isValidPayload(body: unknown): body is VoiceIngestionPayload {
  if (!body || typeof body !== "object") return false;
  const p = body as Record<string, unknown>;
  return (
    typeof p.session_id === "string" &&
    typeof p.timestamp_ms === "number" &&
    typeof p.transcript === "string" &&
    p.transcript.length > 0 &&
    typeof p.urgency_flag === "boolean"
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

    // Force owner_id from JWT — never trust client-supplied hacker_id
    const blocker = await base44.entities.ActiveBlockers.create({
      owner_id: user.id,
      session_id: body.session_id,
      raw_transcript: body.transcript,
      context_tags: body.context_tags ?? [],
      urgency_flag: body.urgency_flag,
      assigned_agent: ASSIGNED_AGENT,
      status: "parsing_intent",
      completion_percentage: 0,
      current_focus: "Queued for synthesis…",
      latency_ms: 0,
      is_resolved: false,
    });

    const response: VoiceIngestionResponse = {
      status: "acknowledged",
      blocker_id: blocker.id as string,
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
