/**
 * Node 03 :: Resolution Feed — Execution & RLS Evals.
 *
 * Grades zero-trust boundaries + latency per evals_document.md §3:
 *   1. Zero-Trust Penetration (owner mismatch => MATRIX_DENIED)
 *   2. Telemetry Latency Benchmark (< 400ms to first stream)
 *   3. Connector Least-Privilege (no secret/branch escalation)
 */
import { type EvalResult, type EvalSuite, grade } from "./harness";
import {
  RLS_DENIED,
  checkConnectorPrivilege,
  executeResolution,
} from "./fixtures/node_mocks";

const NODE = "Node 03 :: Resolution Feed";

/** Telemetry budget: first SynthesisStateStream payload must land < 400ms. */
export const TELEMETRY_BUDGET_MS = 400;

/** Zero-Trust Penetration: cross-tenant access must throw MATRIX_DENIED. */
function evalZeroTrust(): EvalResult {
  const owner = { owner_id: "hacker_alice" };

  // Legitimate owner succeeds.
  let ownerOk = false;
  try {
    ownerOk = executeResolution("read", { userId: "hacker_alice" }, owner).rlsPassed;
  } catch {
    ownerOk = false;
  }

  // Forged token (user.id != owner_id) must be denied with the exact error.
  let denied = false;
  try {
    executeResolution("update", { userId: "attacker_mallory" }, owner);
  } catch (err) {
    denied = err instanceof Error && err.message.startsWith(RLS_DENIED);
  }

  const pass = ownerOk && denied;
  return grade(
    NODE,
    "Zero-Trust Penetration",
    pass,
    pass ? `owner allowed; intruder rejected with ${RLS_DENIED}` : "RLS boundary breached",
  );
}

/** Telemetry Latency Benchmark: hot-path telemetry resolves under budget. */
function evalTelemetryLatency(): EvalResult {
  const trace = executeResolution("read", { userId: "hacker_alice" }, { owner_id: "hacker_alice" });
  const pass = trace.latencyMs < TELEMETRY_BUDGET_MS;
  return grade(
    NODE,
    "Telemetry Latency Benchmark",
    pass,
    `${trace.latencyMs}ms — budget ${TELEMETRY_BUDGET_MS}ms`,
  );
}

/** Connector Least-Privilege: github connector cannot escalate scopes. */
function evalLeastPrivilege(): EvalResult {
  // Legit scopes stay within the manifest.
  const legit = checkConnectorPrivilege("github_auto_commit", ["contents:write", "repo:status"]);
  // Escalation attempt: read secrets + delete repo.
  const escalation = checkConnectorPrivilege("github_auto_commit", ["secrets:read", "delete_repo"]);

  const pass = legit.ok && !escalation.ok;
  return grade(
    NODE,
    "Connector Least-Privilege",
    pass,
    pass
      ? `manifest scopes allowed; escalation blocked (${escalation.violations.join(", ")})`
      : "least-privilege boundary failed",
  );
}

/** Node 03 eval suite. */
export const executionSuite: EvalSuite = {
  node: NODE,
  run: () => [evalZeroTrust(), evalTelemetryLatency(), evalLeastPrivilege()],
};
