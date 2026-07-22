/**
 * Scope-Sniper helpers — friction estimates + Base44 shortcut library (BE-2).
 */
import type { ScopeGradeResult } from "./contracts.ts";

/** High-friction ask → Base44-native shortcut (BE-2.4) */
export const SCOPE_SHORTCUTS: Array<{
  pattern: RegExp;
  frictionHours: number;
  suggestion: string;
}> = [
  {
    pattern: /\b(websocket|web\s*socket|socket\.io|ws\s+chat)\b/i,
    frictionHours: 6,
    suggestion: "Use Base44 entity subscribe() for realtime instead of custom WS chat",
  },
  {
    pattern: /\b(custom\s+auth|roll\s+your\s+own\s+auth|jwt\s+from\s+scratch)\b/i,
    frictionHours: 5,
    suggestion: "Use Base44 auth providers (GitHub/email) — do not roll custom auth",
  },
  {
    pattern: /\b(kafka|rabbitmq|event\s*bus|message\s*queue)\b/i,
    frictionHours: 8,
    suggestion: "Use Base44 entity webhooks + Deno functions instead of a message bus",
  },
  {
    pattern: /\b(kubernetes|k8s|helm|terraform)\b/i,
    frictionHours: 10,
    suggestion: "Stay on Base44 Edge deploy — skip infra orchestration for the hackathon",
  },
  {
    pattern: /\b(graphql\s+federation|apollo\s+gateway)\b/i,
    frictionHours: 7,
    suggestion: "Use typed Base44 functions + entities instead of GraphQL federation",
  },
  {
    pattern: /\b(ml\s+pipeline|train\s+a\s+model|fine-?tun)\b/i,
    frictionHours: 12,
    suggestion: "Call llm_reasoning_core / InvokeLLM — do not train models mid-hackathon",
  },
];

const FRICTION_KEYWORDS: Array<{ pattern: RegExp; hours: number }> = [
  { pattern: /\b(from\s+scratch|rewrite|migrate\s+entire)\b/i, hours: 8 },
  { pattern: /\b(realtime\s+multiplayer|crdt|ot\s+sync)\b/i, hours: 9 },
  { pattern: /\b(payment|stripe\s+connect|pci)\b/i, hours: 5 },
  { pattern: /\b(native\s+app|react\s+native|electron)\b/i, hours: 10 },
];

/** Hours left until countdown_deadline (0 if past / missing). */
export function hoursRemaining(deadlineMs?: number | null): number {
  if (deadlineMs == null || !Number.isFinite(deadlineMs)) return 0;
  return Math.max(0, (deadlineMs - Date.now()) / 3_600_000);
}

/** Heuristic friction hours from transcript (+ shortcut match). */
export function estimateFrictionHours(transcript: string): {
  hours: number;
  shortcut?: string;
} {
  for (const s of SCOPE_SHORTCUTS) {
    if (s.pattern.test(transcript)) {
      return { hours: s.frictionHours, shortcut: s.suggestion };
    }
  }
  let hours = 1.5;
  for (const k of FRICTION_KEYWORDS) {
    if (k.pattern.test(transcript)) hours = Math.max(hours, k.hours);
  }
  if (transcript.length > 400) hours = Math.max(hours, 3);
  return { hours };
}

/** True when transcript clearly overlaps MVP blob tokens. */
export function withinMvp(
  transcript: string,
  mvpDefinition?: string | null,
): boolean {
  const mvp = (mvpDefinition ?? "").trim();
  if (!mvp) return true; // dormant when MVP unset (FE-2.2)
  const tokens = mvp
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
  if (tokens.length === 0) return true;
  const hay = transcript.toLowerCase();
  const hits = tokens.filter((t) => hay.includes(t)).length;
  return hits / tokens.length >= 0.15 || hits >= 2;
}

/**
 * Grade a prompt for Scope-Sniper.
 * Warn when friction ≥ 4h OR outside MVP (when MVP is set).
 */
export function gradeScope(input: {
  transcript: string;
  mvpDefinition?: string | null;
  countdownDeadline?: number | null;
  scopeOverride?: boolean;
}): ScopeGradeResult & { shouldWarn: boolean } {
  if (input.scopeOverride) {
    return {
      friction_hours: 0,
      within_mvp: true,
      warning_message: "Scope override accepted.",
      hours_remaining: hoursRemaining(input.countdownDeadline),
      shouldWarn: false,
    };
  }

  const { hours, shortcut } = estimateFrictionHours(input.transcript);
  const mvpOk = withinMvp(input.transcript, input.mvpDefinition);
  const remaining = hoursRemaining(input.countdownDeadline);
  const shouldWarn = hours >= 4 || !mvpOk;

  const parts: string[] = [];
  if (!mvpOk) parts.push("Request diverges from core_mvp_definition.");
  if (hours >= 4) {
    parts.push(`Estimated build friction ~${hours.toFixed(1)} hours.`);
  }

  return {
    friction_hours: hours,
    within_mvp: mvpOk,
    warning_message: parts.join(" ") || "High-friction request detected.",
    ...(shortcut ? { shortcut_suggestion: shortcut } : {}),
    hours_remaining: remaining,
    shouldWarn,
  };
}
