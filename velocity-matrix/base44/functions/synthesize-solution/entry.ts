/**
 * Node 02 — Synthesis Grid
 * Trigger: ActiveBlockers INSERT webhook (or manual invoke with blocker_id).
 * Streams SynthesisStateStream fields, writes ResolutionArtifact to GeneratedSolutions.
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import type {
  ResolutionArtifact,
  SynthesisStatus,
} from "../../shared/contracts.ts";

/** Manual invoke, entity automation, or nested connector-style payload */
interface WebhookPayload {
  blocker_id?: string;
  record?: { id?: string };
  data?: { id?: string };
  event?: { entity_id?: string; type?: string; entity_name?: string };
  payload?: {
    data?: { id?: string };
    event?: { entity_id?: string };
  };
}

interface LlmSolution {
  parsed_issue: string;
  solution_type: ResolutionArtifact["solution_type"];
  language: string;
  code: string;
  file_path?: string;
  neural_summary: string;
}

const LLM_TIMEOUT_MS = 15_000;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    parsed_issue: { type: "string" },
    solution_type: {
      type: "string",
      enum: ["code_snippet", "architecture_diagram", "terminal_command"],
    },
    language: { type: "string" },
    code: { type: "string" },
    file_path: { type: "string" },
    neural_summary: { type: "string" },
  },
  required: [
    "parsed_issue",
    "solution_type",
    "language",
    "code",
    "neural_summary",
  ],
};

/** Resolve blocker id from webhook / entity automation / direct invoke body */
function resolveBlockerId(body: WebhookPayload): string | null {
  return (
    body.blocker_id ??
    body.event?.entity_id ??
    body.record?.id ??
    body.data?.id ??
    body.payload?.event?.entity_id ??
    body.payload?.data?.id ??
    null
  );
}

/** Patch ActiveBlockers with SynthesisStateStream telemetry */
async function streamStatus(
  // deno-lint-ignore no-explicit-any
  base44: any,
  blockerId: string,
  status: SynthesisStatus,
  completion_percentage: number,
  current_focus: string,
  startedAt: number,
) {
  await base44.entities.ActiveBlockers.update(blockerId, {
    status,
    completion_percentage,
    current_focus,
    latency_ms: Date.now() - startedAt,
  });
}

/** Parse InvokeLLM structured or string response into LlmSolution */
function parseLlmResponse(raw: unknown): LlmSolution {
  if (typeof raw === "object" && raw !== null) {
    return raw as LlmSolution;
  }
  if (typeof raw === "string") {
    return JSON.parse(raw) as LlmSolution;
  }
  throw new Error("Unexpected LLM response shape");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const startedAt = Date.now();
  let blockerId: string | null = null;

  try {
    const body = (await req.json().catch(() => ({}))) as WebhookPayload;
    blockerId = resolveBlockerId(body);

    if (!blockerId) {
      return Response.json(
        { status: "rejected", message: "blocker_id required" },
        { status: 200 },
      );
    }

    const blocker = await base44.entities.ActiveBlockers.get(blockerId);
    if (!blocker) {
      return Response.json(
        { status: "rejected", message: "blocker not found" },
        { status: 200 },
      );
    }

    // Idempotency: dual-path (automation + Node 01 invoke) must not double-synthesize
    const status = blocker.status as string | undefined;
    const pct = Number(blocker.completion_percentage ?? 0);
    if (status && status !== "parsing_intent" && pct > 0) {
      return Response.json(
        { status: "skipped", message: "synthesis already in progress or complete" },
        { status: 200 },
      );
    }

    const existingSolutions = await base44.entities.GeneratedSolutions.filter({
      blocker_reference: blockerId,
    });
    if (Array.isArray(existingSolutions) && existingSolutions.length > 0) {
      return Response.json(
        { status: "skipped", message: "artifact already exists for blocker" },
        { status: 200 },
      );
    }

    const stateList = await base44.entities.HackathonState.list();
    const currentState = stateList[0] as
      | { current_focus_area?: string }
      | undefined;

    await streamStatus(
      base44,
      blockerId,
      "querying_docs",
      25,
      "Scanning HackathonState + connectors…",
      startedAt,
    );

    await streamStatus(
      base44,
      blockerId,
      "generating_logic",
      55,
      "Invoking llm_reasoning_core…",
      startedAt,
    );

    const systemPrompt = `
You are the Velocity Matrix AI Consultant (Node 02 Synthesizer).
Current Focus Area: ${currentState?.current_focus_area ?? "General Infrastructure"}
Hacker's Audio Transcript: "${blocker.raw_transcript as string}"
Context Tags: ${JSON.stringify(blocker.context_tags ?? [])}
Urgency: ${Boolean(blocker.urgency_flag)}

Return a strict JSON object matching the schema with:
- parsed_issue: clean 1-sentence summary
- solution_type: code_snippet | architecture_diagram | terminal_command
- language, code, optional file_path
- neural_summary: short UI blurb
`.trim();

    const llmCall = base44.integrations.Core.InvokeLLM({
      prompt: systemPrompt,
      response_json_schema: RESPONSE_SCHEMA,
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("LLM_TIMEOUT")), LLM_TIMEOUT_MS),
    );

    let solution: LlmSolution;
    try {
      const llmResponse = await Promise.race([llmCall, timeout]);
      solution = parseLlmResponse(llmResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message === "LLM_TIMEOUT" || message.includes("429")) {
        await base44.entities.ActiveBlockers.update(blockerId, {
          parsed_issue: `Degraded: ${message}`,
          is_resolved: false,
          current_focus: "Queued for retry",
          latency_ms: Date.now() - startedAt,
        });
        return Response.json(
          { status: "degraded", message },
          { status: 200 },
        );
      }
      throw error;
    }

    await streamStatus(
      base44,
      blockerId,
      "verifying_syntax",
      85,
      "Verifying generated artifact…",
      startedAt,
    );

    const ownerId = blocker.owner_id as string;
    const artifact = await base44.entities.GeneratedSolutions.create({
      owner_id: ownerId,
      blocker_reference: blockerId,
      solution_type: solution.solution_type,
      language: solution.language,
      code: solution.code,
      ...(solution.file_path ? { file_path: solution.file_path } : {}),
      neural_summary: solution.neural_summary,
      available_actions: ["deploy", "override", "discard"],
      has_been_committed: false,
    });

    await base44.entities.ActiveBlockers.update(blockerId, {
      parsed_issue: solution.parsed_issue,
      status: "verifying_syntax",
      completion_percentage: 100,
      current_focus: "Resolution ready",
      latency_ms: Date.now() - startedAt,
      is_resolved: true,
    });

    const resolution: ResolutionArtifact = {
      artifact_id: artifact.id as string,
      blocker_id: blockerId,
      timestamp: new Date().toISOString(),
      solution_type: solution.solution_type,
      payload: {
        language: solution.language,
        code: solution.code,
        ...(solution.file_path ? { file_path: solution.file_path } : {}),
      },
      neural_summary: solution.neural_summary,
      available_actions: ["deploy", "override", "discard"],
    };

    return Response.json(
      { status: "success", artifact: resolution },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[synthesize-solution]", message);

    if (blockerId) {
      try {
        await base44.entities.ActiveBlockers.update(blockerId, {
          parsed_issue: `System Error: ${message}`,
          is_resolved: false,
          current_focus: "Failed — see ActiveBlockers",
          latency_ms: Date.now() - startedAt,
        });
      } catch {
        // Silent — never crash the matrix loop
      }
    }

    return Response.json(
      { status: "error", handled: true, message },
      { status: 200 },
    );
  }
});
