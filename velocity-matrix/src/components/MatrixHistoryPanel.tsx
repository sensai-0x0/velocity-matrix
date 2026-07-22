/**
 * Peripheral matrix history — resolved blockers + prior solutions (F7).
 */
import type {
  ActiveBlockerRow,
  GeneratedSolutionRow,
} from "@/lib/matrixMappers";

interface MatrixHistoryPanelProps {
  blockers: ActiveBlockerRow[];
  solutions: GeneratedSolutionRow[];
  onReturn: () => void;
}

/** Low-density history layer (hidden until SHOW_HISTORY). */
export function MatrixHistoryPanel({
  blockers,
  solutions,
  onReturn,
}: MatrixHistoryPanelProps) {
  const resolved = blockers
    .filter((b) => b.is_resolved === true)
    .slice(0, 6);
  const prior = solutions.slice(0, 8);

  return (
    <section className="cortex-history" aria-label="Matrix history">
      <p className="cortex-ambient-hint" role="status">
        {">> MATRIX_HISTORY"}
      </p>

      <div className="history-columns">
        <div className="history-column">
          <h2 className="history-heading">resolved blockers</h2>
          <ul className="cortex-history-list">
            {resolved.map((b) => (
              <li key={b.id ?? b.parsed_issue}>
                <span className="history-bio">
                  {b.parsed_issue || b.raw_transcript || b.id || "blocker"}
                </span>
              </li>
            ))}
            {resolved.length === 0 && (
              <li className="cortex-probe">{"// no resolved blockers"}</li>
            )}
          </ul>
        </div>

        <div className="history-column">
          <h2 className="history-heading">prior solutions</h2>
          <ul className="cortex-history-list">
            {prior.map((s) => (
              <li key={s.id ?? s.neural_summary}>
                <span className="history-bio">
                  {s.neural_summary || s.file_path || s.id || "solution"}
                </span>
                {s.has_been_committed ? (
                  <span className="history-meta"> · committed</span>
                ) : null}
              </li>
            ))}
            {prior.length === 0 && (
              <li className="cortex-probe">{"// no solutions yet"}</li>
            )}
          </ul>
        </div>
      </div>

      <button type="button" className="auth-affordance" onClick={onReturn}>
        [ Return ]
      </button>
    </section>
  );
}
