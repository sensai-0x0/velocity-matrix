/**
 * Ensure the authenticated hacker has a Solo-Cell HackathonState row.
 * Soft client seed until B2 Edge provision-hook ships.
 */
import type { User } from "@base44/sdk";
import { base44 } from "@/api/base44Client";

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

/** Create HackathonState if the cell is empty; no-op when a row already exists */
export async function ensureHackathonState(user: User): Promise<void> {
  const HackathonState = base44.entities.HackathonState;
  if (!HackathonState) {
    throw new Error("HackathonState entity is not registered on the Base44 client");
  }

  const rows = await HackathonState.list();
  if (Array.isArray(rows) && rows.length > 0) return;

  await HackathonState.create({
    owner_id: user.id,
    session_id: getOrCreateSessionId(),
    current_focus_area: "General Infrastructure",
    last_active_timestamp: Date.now(),
  });
}
