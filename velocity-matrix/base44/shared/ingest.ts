/**
 * Node 01 transcript enrichment — context tags + urgency (B3).
 * Aligned with evals/fixtures/node_mocks.ts keyword tables.
 */

/** Stress keywords that must flip urgency_flag (evals_document.md). */
export const URGENCY_KEYWORDS = [
  "blocker",
  "broken",
  "asap",
  "urgent",
  "down",
  "failing",
  "crash",
  "stuck",
  "critical",
  "emergency",
] as const;

/** Keyword → context tag rules for ActiveBlockers.context_tags */
const TAG_RULES: Array<{ tag: string; keywords: string[] }> = [
  { tag: "auth", keywords: ["auth", "jwt", "oauth", "rls", "login", "token"] },
  {
    tag: "database",
    keywords: ["database", "postgres", "sql", "supabase", "schema", "table", "entity"],
  },
  {
    tag: "routing",
    keywords: ["route", "router", "api", "endpoint", "cors", "error", "bug", "fix"],
  },
  {
    tag: "deploy",
    keywords: ["deploy", "github", "commit", "function", "synapse"],
  },
  {
    tag: "integration",
    keywords: ["stripe", "webhook", "connector", "integration", "slack"],
  },
  { tag: "backend", keywords: ["backend", "deno", "edge"] },
];

/** Tokenise transcript into lowercase word units */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Derive context_tags from transcript keywords (never empty when signals exist) */
export function deriveContextTags(transcript: string): string[] {
  const tokens = new Set(tokenize(transcript));
  const tags: string[] = [];
  for (const rule of TAG_RULES) {
    if (rule.keywords.some((k) => tokens.has(k))) tags.push(rule.tag);
  }
  return tags;
}

/** True when stress-indicator keywords are present */
export function deriveUrgency(transcript: string): boolean {
  const tokens = new Set(tokenize(transcript));
  return URGENCY_KEYWORDS.some((k) => tokens.has(k));
}

/** Union client tags with server-derived tags (deduped, stable order) */
export function mergeContextTags(
  transcript: string,
  clientTags: string[] | undefined,
): string[] {
  const derived = deriveContextTags(transcript);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...derived, ...(clientTags ?? [])]) {
    const key = t.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Server urgency wins when keywords fire — client cannot suppress a real blocker.
 * Client true still sticks even without keywords.
 */
export function resolveUrgency(
  transcript: string,
  clientFlag: boolean | undefined,
): boolean {
  return deriveUrgency(transcript) || clientFlag === true;
}
