/**
 * Corner bioluminescent Phantom Thread indicator (FE-1.2 / FE-1.3).
 */
import { useState } from "react";
import type { PhantomThreadStateStream } from "@/contracts/data_contracts";

interface PhantomPulseProps {
  threads: PhantomThreadStateStream[];
}

/** Subtle pulse — expands to step micro-panel on click */
export function PhantomPulse({ threads }: PhantomPulseProps) {
  const [open, setOpen] = useState(false);
  const active =
    threads.find((t) =>
      ["queued", "running", "compiling", "pushing"].includes(t.status),
    ) ?? threads[0];

  if (!active) return null;

  const tone =
    active.status === "failed"
      ? "failed"
      : active.status === "complete"
        ? "complete"
        : active.status === "compiling"
          ? "compiling"
          : "running";

  return (
    <div className="phantom-pulse-wrap" data-tone={tone}>
      <button
        type="button"
        className="phantom-pulse"
        aria-label="Phantom Thread status"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div className="phantom-panel" role="status">
          <p className="phantom-panel-title">
            {`>> PHANTOM · ${active.status} · ${active.completion_percentage}%`}
          </p>
          {active.git_branch && (
            <p className="phantom-panel-branch">{active.git_branch}</p>
          )}
          <ul className="phantom-steps">
            {active.steps.map((s) => (
              <li key={s.id} data-status={s.status}>
                {s.label}
                <span>{s.status}</span>
              </li>
            ))}
          </ul>
          {active.error_trace && (
            <p className="phantom-error">{active.error_trace}</p>
          )}
        </div>
      )}
    </div>
  );
}
