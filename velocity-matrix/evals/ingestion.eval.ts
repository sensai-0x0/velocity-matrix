/**
 * Node 01 :: Ambient Cortex — Ingestion Evals.
 *
 * Grades the voice-to-payload pipeline per evals_document.md §1:
 *   1. Intent Classification Accuracy (>= 95%)
 *   2. Urgency Trigger Verification (no false positives)
 *   3. Context Continuity (same session_id => append, not orphan)
 */
import { type EvalResult, type EvalSuite, grade } from "./harness";
import { createIngestor } from "./fixtures/node_mocks";

const NODE = "Node 01 :: Ambient Cortex";

/** Labelled transcript with the expected classification outcome. */
export interface IngestionCase {
  transcript: string;
  expectedIntent: string;
  urgency: boolean;
}

/** Golden set of hackathon prompts (stands in for the 50-prompt corpus). */
export const INGESTION_CASES: IngestionCase[] = [
  { transcript: "create a voice session entity for ambient listening", expectedIntent: "create_entity", urgency: false },
  { transcript: "deploy the ingest voice synapse to base44", expectedIntent: "deploy_function", urgency: false },
  { transcript: "set up a stripe webhook connector", expectedIntent: "setup_integration", urgency: false },
  { transcript: "fix the CORS error on the routing layer", expectedIntent: "fix_error", urgency: false },
  { transcript: "configure oauth login token for auth", expectedIntent: "configure_auth", urgency: false },
  { transcript: "the deploy is broken and it's a blocker, fix it ASAP", expectedIntent: "fix_error", urgency: true },
  { transcript: "the auth login is down, urgent", expectedIntent: "configure_auth", urgency: true },
  { transcript: "create the schema table for active blockers", expectedIntent: "create_entity", urgency: false },
];

/** Casual transcripts that must NOT trip the urgency flag. */
const CASUAL_TRANSCRIPTS = [
  "let's create an entity when we get a chance",
  "maybe deploy that function later today",
  "thinking about adding a stripe webhook eventually",
];

/** Intent Classification Accuracy: >= 95% of golden prompts routed correctly. */
function evalIntentAccuracy(): EvalResult {
  const ingestor = createIngestor();
  let correct = 0;
  for (const c of INGESTION_CASES) {
    const r = ingestor.ingest(c.transcript, `sess_${correct}`);
    if (r.intent === c.expectedIntent && r.status === "classified" && r.confidence >= 0.75) {
      correct += 1;
    }
  }
  const accuracy = correct / INGESTION_CASES.length;
  return grade(
    NODE,
    "Intent Classification Accuracy",
    accuracy >= 0.95,
    `${(accuracy * 100).toFixed(1)}% (${correct}/${INGESTION_CASES.length}) — threshold 95%`,
  );
}

/** Urgency Trigger Verification: fires on stress words, silent on casual speech. */
function evalUrgencyTrigger(): EvalResult {
  const ingestor = createIngestor();
  const truePositives = INGESTION_CASES.filter(
    (c) => ingestor.ingest(c.transcript, "u").urgency_flag === c.urgency,
  ).length;
  const falsePositives = CASUAL_TRANSCRIPTS.filter(
    (t) => ingestor.ingest(t, "casual").urgency_flag,
  ).length;

  const pass = truePositives === INGESTION_CASES.length && falsePositives === 0;
  return grade(
    NODE,
    "Urgency Trigger Verification",
    pass,
    `matched ${truePositives}/${INGESTION_CASES.length}, false positives ${falsePositives}`,
  );
}

/** Context Continuity: follow-ups on the same session_id append, not orphan. */
function evalContextContinuity(): EvalResult {
  const ingestor = createIngestor();
  const sid = "sess_continuity";
  const first = ingestor.ingest("set up a stripe webhook", sid);
  const followup = ingestor.ingest("actually make that webhook accept raw bodies", sid);
  const orphan = ingestor.ingest("unrelated new task on a fresh session", "sess_other");

  const pass =
    first.appended_to_session === false &&
    followup.appended_to_session === true &&
    followup.owner_id === sid && // RLS forwarding held
    orphan.appended_to_session === false;

  return grade(
    NODE,
    "Context Continuity",
    pass,
    pass
      ? "follow-up appended to session; owner_id mapped; new session isolated"
      : "session threading or owner_id mapping failed",
  );
}

/** Node 01 eval suite. */
export const ingestionSuite: EvalSuite = {
  node: NODE,
  run: () => [evalIntentAccuracy(), evalUrgencyTrigger(), evalContextContinuity()],
};
