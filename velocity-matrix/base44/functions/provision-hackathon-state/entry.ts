/**
 * B2 — Auto-provision Solo-Cell HackathonState on first authenticated login.
 * Rule A: owner_id always from JWT via createClientFromRequest — never trust body.
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import type {
  ProvisionHackathonStatePayload,
  ProvisionHackathonStateResult,
} from "../../shared/contracts.ts";

const DEFAULT_FOCUS = "General Infrastructure";

/** Optional onboarding fields; owner_id is never taken from the client */
function parseBody(raw: unknown): ProvisionHackathonStatePayload {
  if (!raw || typeof raw !== "object") return {};
  const b = raw as Record<string, unknown>;
  const out: ProvisionHackathonStatePayload = {};
  if (typeof b.session_id === "string" && b.session_id.length > 0) {
    out.session_id = b.session_id;
  }
  if (
    typeof b.current_focus_area === "string" &&
    b.current_focus_area.length > 0
  ) {
    out.current_focus_area = b.current_focus_area;
  }
  if (typeof b.target_repo_url === "string" && b.target_repo_url.length > 0) {
    out.target_repo_url = b.target_repo_url;
  }
  return out;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user?.id) {
      const denied: ProvisionHackathonStateResult = {
        status: "rejected",
        state_id: "",
        session_id: "",
        error_trace: "MATRIX_DENIED: Unauthorized workspace access.",
      };
      return Response.json(denied, { status: 200 });
    }

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const opts = parseBody(body);

    const existing = await base44.entities.HackathonState.list();
    if (Array.isArray(existing) && existing.length > 0) {
      const row = existing[0] as {
        id?: string;
        session_id?: string;
      };
      // Touch last_active on subsequent logins (idempotent seed)
      if (row.id) {
        try {
          await base44.entities.HackathonState.update(row.id, {
            last_active_timestamp: Date.now(),
            ...(opts.target_repo_url
              ? { target_repo_url: opts.target_repo_url }
              : {}),
            ...(opts.current_focus_area
              ? { current_focus_area: opts.current_focus_area }
              : {}),
          });
        } catch (err) {
          console.warn("[provision-hackathon-state] touch failed", err);
        }
      }
      const result: ProvisionHackathonStateResult = {
        status: "exists",
        state_id: row.id ?? "",
        session_id: row.session_id ?? opts.session_id ?? "",
      };
      return Response.json(result, { status: 200 });
    }

    const sessionId =
      opts.session_id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Date.now()}`);

    const created = await base44.entities.HackathonState.create({
      owner_id: user.id,
      session_id: sessionId,
      current_focus_area: opts.current_focus_area ?? DEFAULT_FOCUS,
      last_active_timestamp: Date.now(),
      ...(opts.target_repo_url
        ? { target_repo_url: opts.target_repo_url }
        : {}),
    });

    const result: ProvisionHackathonStateResult = {
      status: "created",
      state_id: (created.id as string) ?? "",
      session_id: sessionId,
    };
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("[provision-hackathon-state]", err);
    const failed: ProvisionHackathonStateResult = {
      status: "rejected",
      state_id: "",
      session_id: "",
      error_trace: err instanceof Error ? err.message : String(err),
    };
    return Response.json(failed, { status: 200 });
  }
});
