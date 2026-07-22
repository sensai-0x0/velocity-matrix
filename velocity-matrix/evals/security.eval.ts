/**
 * B6 — Security & vocabulary gate (offline; live RLS optional).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { type EvalResult, type EvalSuite, grade } from "./harness";
import { RLS_DENIED } from "./fixtures/node_mocks";
import { MATRIX_DENIAL } from "../base44/entities/security";

const NODE = "B6 :: Security Gate";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Denial strings must use MATRIX_DENIED vocabulary from security.ts */
function evalDenialVocabulary(): EvalResult {
  const values = Object.values(MATRIX_DENIAL);
  const allPrefixed = values.every((m) => m.startsWith(`${RLS_DENIED}:`));
  const securitySrc = readFileSync(
    join(ROOT, "base44/entities/security.ts"),
    "utf8",
  );
  const hasAll =
    securitySrc.includes("Unauthorized workspace access") &&
    securitySrc.includes("Cannot intercept external audio streams") &&
    securitySrc.includes("Codebase access restricted");

  const pass = allPrefixed && hasAll && values.length === 3;
  return grade(
    NODE,
    "MATRIX_DENIED Vocabulary",
    pass,
    pass
      ? `${values.length} denial messages match ${RLS_DENIED} vocabulary`
      : "denial vocabulary drift",
  );
}

/**
 * Live RLS probe — skipped unless VELOCITY_MATRIX_LIVE_RLS=1 and tokens exist.
 * Documents mock-only default until Base44 test JWTs are available.
 */
function evalLiveRlsProbe(): EvalResult {
  const enabled = process.env.VELOCITY_MATRIX_LIVE_RLS === "1";
  if (!enabled) {
    return grade(
      NODE,
      "Live RLS Probe",
      true,
      "skipped (mock-only) — set VELOCITY_MATRIX_LIVE_RLS=1 when test JWTs exist",
    );
  }
  // Placeholder for future live invoke — fail closed if enabled without harness
  return grade(
    NODE,
    "Live RLS Probe",
    false,
    "VELOCITY_MATRIX_LIVE_RLS=1 but live harness not configured",
  );
}

/** Synthesizer must harden parse + degraded retry path (static contract) */
function evalSynthesizerHardening(): EvalResult {
  const synth = readFileSync(
    join(ROOT, "base44/functions/synthesize-solution/entry.ts"),
    "utf8",
  );
  const llm = readFileSync(join(ROOT, "base44/shared/llm.ts"), "utf8");
  const pass =
    llm.includes("parseLlmResponse") &&
    synth.includes("invokeReasoningCore") &&
    synth.includes("Queued for retry") &&
    synth.includes("reinvoke_synthesize_solution") &&
    synth.includes("is_resolved: true");
  return grade(
    NODE,
    "Synthesizer B4 Hardening Present",
    pass,
    pass ? "parse/retry/terminal fields present" : "missing B4 synthesizer guards",
  );
}

export const securitySuite: EvalSuite = {
  node: NODE,
  run: () => [
    evalDenialVocabulary(),
    evalLiveRlsProbe(),
    evalSynthesizerHardening(),
  ],
};
