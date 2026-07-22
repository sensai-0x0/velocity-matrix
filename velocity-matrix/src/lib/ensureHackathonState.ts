/**
 * Ensure the authenticated hacker has a Solo-Cell HackathonState row (B2).
 * Prefers Edge provision-hackathon-state (JWT owner_id); falls back to client create.
 */
import type { User } from "@base44/sdk";
import { base44 } from "@/api/base44Client";
import type { ProvisionHackathonStateResult } from "@/contracts/data_contracts";

const SESSION_KEY = "velocity-matrix.session_id";

/** Stable browser session id for correlating voice ingest */
export function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess_${Date.now()}`;
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

/** Unwrap Base44 invoke `.data` envelope */
function unwrapInvoke<T>(result: unknown): T {
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: T }).data;
  }
  return result as T;
}

/** Create HackathonState if the cell is empty; no-op when a row already exists */
export async function ensureHackathonState(_user: User): Promise<void> {
  const sessionId = getOrCreateSessionId();

  try {
    const raw = await base44.functions.invoke("provision-hackathon-state", {
      session_id: sessionId,
    });
    const result = unwrapInvoke<ProvisionHackathonStateResult>(raw);
    if (result.status === "rejected") {
      throw new Error(
        result.error_trace ??
          "MATRIX_DENIED: HackathonState provision rejected",
      );
    }
    if (result.session_id) {
      sessionStorage.setItem(SESSION_KEY, result.session_id);
    }
    return;
  } catch (err) {
    console.warn(
      "[ensureHackathonState] Edge provision failed — client fallback",
      err,
    );
  }

  // Fallback: direct entity create (still under SDK JWT / RLS)
  const HackathonState = base44.entities.HackathonState;
  if (!HackathonState) {
    throw new Error(
      "HackathonState entity is not registered on the Base44 client",
    );
  }

  const rows = await HackathonState.list();
  if (Array.isArray(rows) && rows.length > 0) return;

  await HackathonState.create({
    owner_id: _user.id,
    session_id: sessionId,
    current_focus_area: "General Infrastructure",
    last_active_timestamp: Date.now(),
  });
}
