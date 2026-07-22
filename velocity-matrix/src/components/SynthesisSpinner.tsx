/**
 * Synthesis Grid visualizer — tracks Node 02 artifact compilation.
 * Props align with SynthesisStateStream for F5 wiring.
 */
import type { CSSProperties } from "react";
import type { SynthesisStatus } from "@/contracts/data_contracts";

const STATUS_LABELS: Record<SynthesisStatus, string> = {
  parsing_intent: ">> PARSING_INTENT…",
  querying_docs: ">> QUERYING_DOCS…",
  generating_logic: ">> GENERATING_LOGIC…",
  verifying_syntax: ">> VERIFYING_SYNTAX…",
};

export function SynthesisSpinner({
  synthesizing = false,
  label = "Synthesizing",
  progress,
  status,
  focus,
  latencyMs,
  degraded = false,
}: {
  synthesizing?: boolean;
  label?: string;
  /** SynthesisStateStream.completion_percentage */
  progress?: number;
  /** SynthesisStateStream.status */
  status?: SynthesisStatus;
  /** SynthesisStateStream.current_focus */
  focus?: string;
  /** SynthesisStateStream.latency_ms */
  latencyMs?: number;
  /** Degraded / retrying UX from Node 02 timeout path */
  degraded?: boolean;
}) {
  const displayLabel =
    status != null ? STATUS_LABELS[status] : label;
  const pct =
    progress != null ? Math.max(0, Math.min(100, progress)) : undefined;

  return (
    <div
      className="synthesis-spinner"
      data-synthesizing={synthesizing}
      data-degraded={degraded}
      style={
        pct != null
          ? ({ "--synthesis-progress": `${pct}%` } as CSSProperties)
          : undefined
      }
      aria-busy={synthesizing}
      aria-label={displayLabel}
      role="status"
    >
      <div className="spinner-ring" />
      <span className="spinner-label">
        {synthesizing ? displayLabel : "Idle"}
      </span>
      {focus ? <span className="spinner-focus">{focus}</span> : null}
      {latencyMs != null ? (
        <span className="spinner-latency">{latencyMs}ms</span>
      ) : null}
      {pct != null ? (
        <span className="spinner-progress">{Math.round(pct)}%</span>
      ) : null}
    </div>
  );
}
