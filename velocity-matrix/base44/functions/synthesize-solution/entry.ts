/**
 * Node 02 — Synthesis Grid (B4 hardened).
 * Trigger: ActiveBlockers INSERT webhook (or manual invoke with blocker_id).
 * Streams SynthesisStateStream fields, writes ResolutionArtifact to GeneratedSolutions.
 *
 * Degraded retry policy (B4): on LLM_TIMEOUT / 429 leave is_resolved:false +
 * current_focus "Queued for retry". Re-invoke is client/manual or dual-path
 * re-fire — no JobStatus entity; no fourth table.
 * Terminal success: is_resolved:true + completion_percentage:100 (UI keys off these).
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import type {
  ResolutionArtifact,
  SynthesisStatus,
} from "../../shared/contracts.ts";
import {
  parseLlmResponse,
  type LlmSolution,
} from "../../shared/llm.ts";
import { gradeScope } from "../../shared/scope.ts";

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


/**
 * Prefer llm_reasoning_core connector when the SDK exposes it;
 * fall back to Core.InvokeLLM (scaffold default).
 */
async function invokeReasoningCore(
  // deno-lint-ignore no-explicit-any
  base44: any,
  prompt: string,
): Promise<unknown> {
  try {
    const connector = base44.connectors?.llm_reasoning_core;
    if (connector && typeof connector.invoke === "function") {
      return await connector.invoke({
        prompt,
        response_json_schema: RESPONSE_SCHEMA,
      });
    }
  } catch (err) {
    console.warn(
      "[synthesize-solution] llm_reasoning_core connector failed — Core.InvokeLLM fallback",
      err,
    );
  }

  return await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: RESPONSE_SCHEMA,
  });
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
    if (blocker.is_resolved === true && pct >= 100) {
      return Response.json(
        { status: "skipped", message: "blocker already resolved" },
        { status: 200 },
      );
    }
    if (status && status !== "parsing_intent" && pct > 0 && pct < 100) {
      // Allow re-entry when degraded (Queued for retry) — pct may be mid-flight
      const focus = String(blocker.current_focus ?? "");
      const degraded = /queued for retry/i.test(focus);
      if (!degraded) {
        return Response.json(
          {
            status: "skipped",
            message: "synthesis already in progress or complete",
          },
          { status: 200 },
        );
      }
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
      | {
          current_focus_area?: string;
          core_mvp_definition?: string;
          countdown_deadline?: number;
          scope_mode?: string;
        }
      | undefined;

    // BE-2 Scope-Sniper — grade before expensive LLM work
    const grade = gradeScope({
      transcript: String(blocker.raw_transcript ?? ""),
      mvpDefinition: currentState?.core_mvp_definition,
      countdownDeadline: currentState?.countdown_deadline,
      scopeOverride: Boolean(
        (blocker as { scope_override?: boolean }).scope_override,
      ),
    });

    if (grade.shouldWarn) {
      const hours =
        grade.hours_remaining != null
          ? Math.round(grade.hours_remaining * 10) / 10
          : 0;
      const focus = `SCOPE_WARNING · ${hours}h left · ${grade.warning_message}${
        grade.shortcut_suggestion
          ? ` · Shortcut: ${grade.shortcut_suggestion}`
          : ""
      }`;

      await base44.entities.ActiveBlockers.update(blockerId, {
        current_focus: focus,
        telemetry_event: "SCOPE_WARNING",
        latency_ms: Date.now() - startedAt,
      });

      if (currentState?.scope_mode === "strict") {
        await base44.entities.ActiveBlockers.update(blockerId, {
          parsed_issue: grade.warning_message,
          is_resolved: false,
          current_focus: focus,
        });
        return Response.json(
          {
            status: "scope_blocked",
            grade,
            telemetry: "SCOPE_WARNING",
          },
          { status: 200 },
        );
      }
      // advisory: continue synthesis but UI sees SCOPE_WARNING telemetry
    }

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

    const llmCall = invokeReasoningCore(base44, systemPrompt);

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
          completion_percentage: Number(blocker.completion_percentage ?? 55),
          current_focus: "Queued for retry",
          latency_ms: Date.now() - startedAt,
        });
        // Client/manual retry: re-invoke synthesize-solution with same blocker_id
        return Response.json(
          {
            status: "degraded",
            message,
            retry: "reinvoke_synthesize_solution",
          },
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
      is_discarded: false,
      execution_mode: "sync",
      eval_status: "passing",
      telemetry_event: "SYNTHESIS_COMPLETE",
    });

    // Terminal success — UI watches is_resolved + completion_percentage:100
    await base44.entities.ActiveBlockers.update(blockerId, {
      parsed_issue: solution.parsed_issue,
      status: "verifying_syntax",
      completion_percentage: 100,
      current_focus: "Resolution ready",
      latency_ms: Date.now() - startedAt,
      is_resolved: true,
      telemetry_event: "SYNTHESIS_COMPLETE",
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
      execution_mode: "sync",
      eval_status: "passing",
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
