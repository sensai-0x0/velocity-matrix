/**
 * Node 02 :: Synthesis Grid — Synthesis Evals.
 *
 * Grades the LLM's generated output per evals_document.md §2:
 *   1. Payload Schema Adherence (strict ResolutionArtifact contract)
 *   2. AST Compilation Check (payload.code must parse cleanly)
 *   3. Hallucination Penalty (refuse connectors not in the manifest)
 */
import { type EvalResult, type EvalSuite, grade, tsSyntaxErrors } from "./harness";
import {
  type ResolutionArtifact,
  synthesize,
} from "./fixtures/node_mocks";

const NODE = "Node 02 :: Synthesis Grid";

const SOLUTION_TYPES = new Set(["code_snippet", "architecture_diagram", "terminal_command"]);
const VALID_ACTIONS = new Set(["deploy", "override", "discard"]);

/**
 * Validates a ResolutionArtifact against the data-contracts.md interface.
 * A single missing/invalid field fails the eval.
 */
export function validateArtifact(a: ResolutionArtifact): string[] {
  const reasons: string[] = [];
  if (!a.artifact_id) reasons.push("missing artifact_id");
  if (!a.blocker_id) reasons.push("missing blocker_id");
  if (!a.timestamp) reasons.push("missing timestamp");
  if (!SOLUTION_TYPES.has(a.solution_type)) reasons.push(`invalid solution_type: ${a.solution_type}`);
  if (!a.payload || typeof a.payload !== "object") reasons.push("missing payload object");
  else {
    if (!a.payload.language) reasons.push("missing payload.language");
    if (typeof a.payload.code !== "string" || a.payload.code.length === 0) {
      reasons.push("missing payload.code");
    }
  }
  if (!a.neural_summary) reasons.push("missing neural_summary");
  if (!Array.isArray(a.available_actions) || a.available_actions.length === 0) {
    reasons.push("missing available_actions");
  } else if (!a.available_actions.every((x) => VALID_ACTIONS.has(x))) {
    reasons.push("invalid available_actions entry");
  }
  return reasons;
}

/** Payload Schema Adherence: emitted artifact matches the strict contract. */
function evalSchemaAdherence(): EvalResult {
  const out = synthesize({
    sessionId: "sess_1",
    blockerId: "blk_1",
    intent: "deploy_function",
    prompt: "deploy the process-voice-command synapse",
  });
  if (out.kind !== "artifact") {
    return grade(NODE, "Payload Schema Adherence", false, `expected artifact, got ${out.kind}`);
  }
  const reasons = validateArtifact(out.artifact);
  return grade(
    NODE,
    "Payload Schema Adherence",
    reasons.length === 0,
    reasons.length === 0 ? "ResolutionArtifact contract satisfied" : reasons.join("; "),
  );
}

/** AST Compilation Check: valid code parses, malformed code is caught. */
function evalAstCompilation(): EvalResult {
  const good = synthesize({ sessionId: "s", blockerId: "b1", intent: "deploy_function", prompt: "ship it" });
  const bad = synthesize({
    sessionId: "s",
    blockerId: "b2",
    intent: "deploy_function",
    prompt: "ship it",
    forceBrokenCode: true,
  });

  if (good.kind !== "artifact" || bad.kind !== "artifact") {
    return grade(NODE, "AST Compilation Check", false, "synthesizer did not emit artifacts");
  }

  const goodErrors = tsSyntaxErrors(good.artifact.payload.code);
  const badErrors = tsSyntaxErrors(bad.artifact.payload.code);

  // Pass only if clean code compiles AND the parser rejects malformed code.
  const pass = goodErrors.length === 0 && badErrors.length > 0;
  return grade(
    NODE,
    "AST Compilation Check",
    pass,
    `valid=${goodErrors.length} errors, malformed=${badErrors.length} errors (want 0 / >0)`,
  );
}

/** Hallucination Penalty: refuse a connector absent from the manifest. */
function evalHallucinationPenalty(): EvalResult {
  const legit = synthesize({
    sessionId: "s",
    blockerId: "b3",
    intent: "setup_integration",
    prompt: "push the file using github_auto_commit",
  });
  const hallucinated = synthesize({
    sessionId: "s",
    blockerId: "b4",
    intent: "setup_integration",
    prompt: "Use the AWS_S3 connector to upload the artifact",
  });

  const pass = legit.kind === "artifact" && hallucinated.kind === "refusal";
  const detail =
    hallucinated.kind === "refusal"
      ? `refused '${hallucinated.requestedConnector}'; legit connector accepted`
      : "failed to refuse hallucinated connector";
  return grade(NODE, "Hallucination Penalty", pass, detail);
}

/** Node 02 eval suite. */
export const synthesisSuite: EvalSuite = {
  node: NODE,
  run: () => [evalSchemaAdherence(), evalAstCompilation(), evalHallucinationPenalty()],
};
