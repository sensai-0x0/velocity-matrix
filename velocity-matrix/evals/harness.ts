/**
 * Shared eval harness for the Velocity Matrix AI eval suite.
 *
 * These evals are grading scripts (not unit tests). They validate agent
 * reasoning, payload/contract adherence, and zero-trust boundaries described in
 * `evals/evals_document.md` and the `agents/` blueprints before deploy.
 */
import ts from "typescript";

/** Outcome of a single graded eval assertion. */
export interface EvalResult {
  /** Owning agent node, e.g. "Node 01 :: Ambient Cortex". */
  node: string;
  /** Short eval name from evals_document.md. */
  name: string;
  /** Whether the eval passed its acceptance threshold. */
  pass: boolean;
  /** Human-readable metric / failure reason. */
  detail: string;
}

/** A group of related evals for one agent node. */
export interface EvalSuite {
  /** Owning agent node label. */
  node: string;
  /** Executes every eval in the suite and returns graded results. */
  run(): EvalResult[];
}

/**
 * Runs a TypeScript snippet through the compiler's parser and returns only
 * syntax-level errors. This is the "AST Compilation Check" stand-in: it flags
 * malformed synthesis output without requiring full type resolution.
 */
export function tsSyntaxErrors(code: string): string[] {
  const out = ts.transpileModule(code, {
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
      noEmit: true,
    },
  });
  return (out.diagnostics ?? [])
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

/** Helper to build a passing/failing result with a consistent shape. */
export function grade(
  node: string,
  name: string,
  pass: boolean,
  detail: string,
): EvalResult {
  return { node, name, pass, detail };
}
