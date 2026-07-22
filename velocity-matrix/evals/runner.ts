/**
 * Velocity Matrix AI Eval runner.
 *
 * Aggregates every node suite, prints a Neuropunk-styled report, and exits
 * non-zero on any failure so `init_matrix.sh` Phase 5 aborts the Base44 deploy
 * when RLS or payload contracts regress.
 *
 * Run: `bun run evals:run`  (or `bun evals/runner.ts`)
 */
import type { EvalResult, EvalSuite } from "./harness";
import { ingestionSuite } from "./ingestion.eval";
import { synthesisSuite } from "./synthesis.eval";
import { executionSuite } from "./execution.eval";
import { securitySuite } from "./security.eval";

const SUITES: EvalSuite[] = [ingestionSuite, synthesisSuite, executionSuite, securitySuite];

/** ANSI colour helpers for the terminal report (green pass / crimson fail). */
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

/** Executes all suites and returns the flat list of graded results. */
function runAll(): EvalResult[] {
  const results: EvalResult[] = [];
  for (const suite of SUITES) {
    console.log(`\n${c.cyan(`>> ${suite.node}`)}`);
    for (const r of suite.run()) {
      results.push(r);
      const badge = r.pass ? c.green("[ PASS ]") : c.red("[ FAIL ]");
      console.log(`   ${badge} ${r.name} ${c.dim(`— ${r.detail}`)}`);
    }
  }
  return results;
}

console.log(c.cyan("\n// VELOCITY_MATRIX :: AI_EVAL_MATRIX\n"));
const results = runAll();
const failed = results.filter((r) => !r.pass);
const passed = results.length - failed.length;

console.log(
  `\n${c.cyan("// RESULT ::")} ${passed}/${results.length} passed` +
    (failed.length ? ` ${c.red(`(${failed.length} failed)`)}` : c.green(" — MATRIX VERIFIED")),
);

if (failed.length > 0) {
  console.error(c.red("\n>> [FATAL] AI Evals failed. Deployment must abort.\n"));
  process.exit(1);
}
process.exit(0);
