/**
 * Phantom Thread intent detection + branch helpers (BE-1).
 */

const PHANTOM_RE =
  /\b(phantom\s*thread|in\s+the\s+background|spin\s+up\s+a\s+phantom|background\s+(worker|task|job)|while\s+i\s+(work|build|focus))\b/i;

/** Detect multi-step background spawn intent from transcript */
export function detectPhantomIntent(transcript: string): boolean {
  return PHANTOM_RE.test(transcript);
}

/** Default step labels when voice brief does not enumerate steps */
export function defaultPhantomSteps(brief: string): Array<{
  id: string;
  label: string;
  status: string;
}> {
  return [
    { id: "parse", label: "Parse brief", status: "pending" },
    { id: "synth", label: "Synthesize artifacts", status: "pending" },
    {
      id: "route",
      label: /deno|route|webhook|stripe/i.test(brief)
        ? "Configure Deno route / webhook"
        : "Scaffold Edge route",
      status: "pending",
    },
    { id: "evals", label: "Run evals", status: "pending" },
    { id: "push", label: "Push phantom branch", status: "pending" },
  ];
}

/** Safe git branch slug from thread id + brief */
export function phantomBranchName(threadId: string, brief: string): string {
  const slug = brief
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const short = threadId.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "thread";
  return `phantom/${short}-${slug || "task"}`;
}
