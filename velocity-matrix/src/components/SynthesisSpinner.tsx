/**
 * Synthesis Grid visualizer — tracks Node 02 artifact compilation (F5).
 */
import type { CSSProperties } from "react";
import type { SynthesisStatus } from "@/contracts/data_contracts";

const STATUS_LABELS: Record<SynthesisStatus, string> = {
  parsing_intent: ">> PARSING_INTENT…",
  querying_docs: ">> SCANNING_CONNECTORS…",
  generating_logic: ">> SYNTHESIZING_ARCHITECTURE…",
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
  failed = false,
}: {
  synthesizing?: boolean;
  label?: string;
  progress?: number;
  status?: SynthesisStatus;
  focus?: string;
  latencyMs?: number;
  degraded?: boolean;
  failed?: boolean;
}) {
  const displayLabel = failed
    ? ">> FAILED_NODE"
    : degraded
      ? ">> DEGRADED · RETRYING..."
      : status != null
        ? STATUS_LABELS[status]
        : label;
  const pct =
    progress != null ? Math.max(0, Math.min(100, progress)) : undefined;

  return (
    <div
      className="synthesis-spinner"
      data-synthesizing={synthesizing}
      data-degraded={degraded}
      data-failed={failed}
      style={
        pct != null
          ? ({ "--synthesis-progress": `${pct}%` } as CSSProperties)
          : undefined
      }
      aria-busy={synthesizing && !failed}
      aria-label={displayLabel}
      role="status"
    >
      <div className="spinner-ring" aria-hidden />
      <div className="spinner-copy">
        <span className="spinner-label">
          {synthesizing || degraded || failed ? displayLabel : "Idle"}
        </span>
        {focus ? <span className="spinner-focus">{focus}</span> : null}
        <span className="spinner-meta">
          {latencyMs != null ? <span>{latencyMs}ms</span> : null}
          {pct != null ? <span>{Math.round(pct)}%</span> : null}
        </span>
      </div>
    </div>
  );
}
