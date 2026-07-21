/**
 * Deterministic mock implementations of the three Velocity Matrix agent nodes.
 *
 * Live evals cannot call Base44 / Claude in CI, so these mocks encode the
 * *documented* behaviour from the `agents/` blueprints:
 *   - AGENTS.md            (node roles, RLS forwarding: session_id -> owner_id)
 *   - 02_entity_schemas.md (ActiveBlockers / owner_id tenancy)
 *   - 05_security_and_rls  (MATRIX_DENIED zero-trust error)
 *   - 06_connector_manifest(allowed connectors + least-privilege scopes)
 *   - data-contracts.md    (ResolutionArtifact / ExecutionPayload shapes)
 *
 * They are intentionally simple and side-effect free so evals stay reproducible.
 */

/** Exact zero-trust denial string from 05_security_and_rls.md. */
export const RLS_DENIED = "MATRIX_DENIED";

/**
 * Connectors registered in 06_connector_manifest.json. Anything outside this
 * set is a hallucination and must be refused by Node 02.
 */
export const CONNECTOR_MANIFEST = {
  github_auto_commit: {
    type: "github",
    scopes: ["repo:status", "public_repo", "contents:write"],
    branchScope: "main",
  },
  slack_notifier: {
    type: "slack",
    scopes: ["chat:write", "channels:read"],
  },
  llm_reasoning_core: {
    type: "ai_provider",
    provider: "anthropic",
    model: "claude-3-5-sonnet",
  },
} as const;

/** Names of every legitimate connector. */
export const ALLOWED_CONNECTORS = Object.keys(CONNECTOR_MANIFEST);

/** Scopes a connector must NEVER hold (secret exfil / branch tampering). */
export const FORBIDDEN_SCOPES = [
  "secrets:read",
  "admin:org",
  "admin:repo_hook",
  "delete_repo",
  "workflow",
];

// ---------------------------------------------------------------------------
// Node 01 :: The Ingestor (Ambient Cortex)
// ---------------------------------------------------------------------------

/** Structured output of the voice ingestion pipeline (Node 01). */
export interface IngestionResult {
  session_id: string;
  /** Mapped from session_id to satisfy RLS (AGENTS.md Rule A). */
  owner_id: string;
  transcript: string;
  intent: string;
  confidence: number;
  context_tags: string[];
  urgency_flag: boolean;
  status: "classified" | "failed";
  /** True when appended to an existing session rather than orphaned. */
  appended_to_session: boolean;
}

/** Keyword -> (intent, context tags) routing table for the Ingestor. */
const INTENT_RULES: Array<{ intent: string; keywords: string[]; tags: string[] }> = [
  { intent: "create_entity", keywords: ["create", "entity", "schema", "table"], tags: ["database"] },
  { intent: "deploy_function", keywords: ["deploy", "function", "synapse", "endpoint"], tags: ["backend"] },
  { intent: "setup_integration", keywords: ["stripe", "webhook", "connector", "integration", "slack"], tags: ["integration"] },
  { intent: "fix_error", keywords: ["fix", "cors", "error", "bug", "broken", "failing"], tags: ["routing"] },
  { intent: "configure_auth", keywords: ["auth", "login", "oauth", "token", "rls"], tags: ["auth"] },
];

/** Stress keywords that must flip urgency_flag (evals_document.md). */
const URGENCY_KEYWORDS = ["blocker", "broken", "asap", "urgent", "down", "failing", "crash", "stuck"];

/** Tokenises a transcript into lowercase word units for keyword matching. */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/**
 * The Ingestor node. Stateful across a session so it can prove context
 * continuity: repeated prompts on the same session_id append instead of
 * spawning orphaned tasks.
 */
export function createIngestor() {
  const knownSessions = new Set<string>();

  return {
    /** Classifies a transcript and structures the ActiveBlockers payload. */
    ingest(transcript: string, sessionId: string): IngestionResult {
      const tokens = new Set(tokenize(transcript));

      // Score each intent rule by keyword overlap; highest wins.
      let best = { intent: "unknown", tags: [] as string[], hits: 0 };
      for (const rule of INTENT_RULES) {
        const hits = rule.keywords.filter((k) => tokens.has(k)).length;
        if (hits > best.hits) best = { intent: rule.intent, tags: rule.tags, hits };
      }

      const confidence = best.hits === 0 ? 0.2 : Math.min(0.6 + best.hits * 0.15, 0.99);
      const urgency_flag = URGENCY_KEYWORDS.some((k) => tokens.has(k));

      const appended_to_session = knownSessions.has(sessionId);
      knownSessions.add(sessionId);

      return {
        session_id: sessionId,
        owner_id: sessionId, // RLS forwarding: map session_id -> owner_id
        transcript,
        intent: best.intent,
        confidence,
        context_tags: best.tags,
        urgency_flag,
        status: best.intent === "unknown" ? "failed" : "classified",
        appended_to_session,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Node 02 :: The Synthesizer (Synthesis Grid)
// ---------------------------------------------------------------------------

/** ResolutionArtifact payload, per data-contracts.md section 3. */
export interface ResolutionArtifact {
  artifact_id: string;
  blocker_id: string;
  timestamp: string;
  solution_type: "code_snippet" | "architecture_diagram" | "terminal_command";
  payload: { language: string; code: string; file_path?: string };
  neural_summary: string;
  available_actions: Array<"deploy" | "override" | "discard">;
}

/** A synthesis request handed to Node 02. */
export interface SynthRequest {
  sessionId: string;
  blockerId: string;
  intent: string;
  prompt: string;
  /** Set true only in the negative AST eval to force malformed output. */
  forceBrokenCode?: boolean;
}

/** Node 02 either emits an artifact or refuses a hallucinated connector. */
export type SynthOutput =
  | { kind: "artifact"; artifact: ResolutionArtifact }
  | { kind: "refusal"; reason: string; requestedConnector: string };

/** Detects a connector reference in the prompt that is not in the manifest. */
function findHallucinatedConnector(prompt: string): string | null {
  // Connector-ish tokens: UPPER_SNAKE or *_connector style identifiers.
  const candidates = prompt.match(/\b[A-Z][A-Z0-9_]{2,}\b|\b\w+_connector\b/g) ?? [];
  for (const raw of candidates) {
    const name = raw.toLowerCase();
    if (name === "use") continue;
    const isKnown = ALLOWED_CONNECTORS.some((c) => name.includes(c) || c.includes(name));
    if (!isKnown) return raw;
  }
  return null;
}

/**
 * The Synthesizer node. Produces a spec-compliant ResolutionArtifact, or
 * refuses when the prompt asks for a connector outside the manifest.
 */
export function synthesize(req: SynthRequest): SynthOutput {
  const hallucinated = findHallucinatedConnector(req.prompt);
  if (hallucinated) {
    return {
      kind: "refusal",
      requestedConnector: hallucinated,
      reason: `Refused: '${hallucinated}' is not in 06_connector_manifest.json. Allowed: ${ALLOWED_CONNECTORS.join(", ")}.`,
    };
  }

  const code = req.forceBrokenCode
    ? "export const handler = (req => { return Response.json({ ok: true )"
    : [
        "export async function handler(req: Request): Promise<Response> {",
        "  const body = await req.json();",
        "  return Response.json({ ok: true, echo: body });",
        "}",
      ].join("\n");

  return {
    kind: "artifact",
    artifact: {
      artifact_id: `art_${req.blockerId}`,
      blocker_id: req.blockerId,
      timestamp: new Date(0).toISOString(),
      solution_type: "code_snippet",
      payload: { language: "typescript", code, file_path: "base44/functions/index.ts" },
      neural_summary: `Synthesized ${req.intent} artifact for session ${req.sessionId}.`,
      available_actions: ["deploy", "override", "discard"],
    },
  };
}

// ---------------------------------------------------------------------------
// Node 03 :: The Executor (Resolution Feed)
// ---------------------------------------------------------------------------

/** Authenticated session context for an execution attempt. */
export interface AuthContext {
  userId: string;
}

/** A stored row carrying its tenant owner_id. */
export interface OwnedRecord {
  owner_id: string;
}

/** Result of a Node 03 execution attempt. */
export interface ExecResult {
  rlsPassed: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * The Executor node. Enforces strict owner matching (05_security_and_rls.md):
 * throws MATRIX_DENIED when the session user does not own the row.
 */
export function executeResolution(
  action: "read" | "update" | "commit",
  auth: AuthContext,
  record: OwnedRecord,
): ExecResult {
  if (auth.userId !== record.owner_id) {
    throw new Error(`${RLS_DENIED}: ${action} blocked (owner mismatch).`);
  }
  // Simulated telemetry latency: reads/updates are hot-path, commits heavier.
  const latencyMs = action === "commit" ? 220 : 45;
  return { rlsPassed: true, latencyMs };
}

/**
 * Least-privilege check for a connector: its granted scopes must be a subset of
 * the manifest and must contain none of the FORBIDDEN_SCOPES.
 */
export function checkConnectorPrivilege(
  connector: keyof typeof CONNECTOR_MANIFEST,
  requestedScopes: string[],
): { ok: boolean; violations: string[] } {
  const allowed = new Set<string>(
    (CONNECTOR_MANIFEST[connector] as { scopes?: string[] }).scopes ?? [],
  );
  const violations: string[] = [];
  for (const scope of requestedScopes) {
    if (FORBIDDEN_SCOPES.includes(scope)) violations.push(`forbidden: ${scope}`);
    else if (!allowed.has(scope)) violations.push(`out-of-scope: ${scope}`);
  }
  return { ok: violations.length === 0, violations };
}
