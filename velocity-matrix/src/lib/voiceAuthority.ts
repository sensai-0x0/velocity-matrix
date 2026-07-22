/**
 * Voice authority phrase matching for Cancel / matrix history (F7).
 */
import type { CortexEvent } from "@/cortex/cortexMachine";

/** Map spoken phrases → cortex events (works mid-synthesis / resolution). */
export function matchVoiceAuthority(transcript: string): CortexEvent | null {
  const t = transcript.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return null;

  if (
    /\bcancel that\b/.test(t) ||
    /^cancel\.?$/.test(t) ||
    /\bcancel synthesis\b/.test(t)
  ) {
    return { type: "CANCEL" };
  }

  if (/\bshow matrix history\b/.test(t) || /\bmatrix history\b/.test(t)) {
    return { type: "SHOW_HISTORY" };
  }

  if (/\bhide (matrix )?history\b/.test(t) || /\breturn to cortex\b/.test(t)) {
    return { type: "HIDE_HISTORY" };
  }

  return null;
}
