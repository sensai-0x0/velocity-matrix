/**
 * Dev / QA affordances to walk the Cortex machine without live backend (F2 exit criteria).
 */
import type { CortexEvent, CortexView } from "@/cortex/cortexMachine";

interface CortexMockControlsProps {
  view: CortexView;
  dispatch: (event: CortexEvent) => void;
  visible: boolean;
}

/** Text-string mock triggers — only shown when authenticated */
export function CortexMockControls({
  view,
  dispatch,
  visible,
}: CortexMockControlsProps) {
  if (!visible) return null;

  return (
    <aside className="cortex-mock" aria-label="Cortex mock transitions">
      <p className="cortex-mock-label">{"// MOCK_TRANSITIONS"}</p>
      <div className="cortex-mock-row">
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          disabled={view === "locked"}
          onClick={() =>
            dispatch({
              type: "INGEST_ACKNOWLEDGED",
              blockerId: "mock-blocker-1",
            })
          }
        >
          [ Mock Ingest → Synthesis ]
        </button>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          disabled={view === "locked"}
          onClick={() =>
            dispatch({
              type: "ARTIFACT_CREATED",
              artifactId: "mock-artifact-1",
              blockerId: "mock-blocker-1",
            })
          }
        >
          [ Mock Artifact → Resolution ]
        </button>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          disabled={view === "locked" || view === "ambient"}
          onClick={() => dispatch({ type: "CANCEL" })}
        >
          [ Cancel → Ambient ]
        </button>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          disabled={view === "locked"}
          onClick={() =>
            dispatch({
              type: view === "history" ? "HIDE_HISTORY" : "SHOW_HISTORY",
            })
          }
        >
          {view === "history"
            ? "[ Hide History ]"
            : "[ Show Matrix History ]"}
        </button>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          disabled={view === "locked"}
          onClick={() =>
            dispatch({
              type: view === "blueprint" ? "HIDE_BLUEPRINT" : "SHOW_BLUEPRINT",
            })
          }
        >
          {view === "blueprint"
            ? "[ Exit Neural Blueprint ]"
            : "[ Visualize Data Flow ]"}
        </button>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          disabled={view === "locked"}
          onClick={() =>
            dispatch({
              type: "SCOPE_WARNING",
              hoursRemaining: 14,
              warningMessage: "High-friction request detected.",
              shortcutSuggestion: "Base44 realtime subscribe shortcut",
            })
          }
        >
          [ Mock Scope Warning ]
        </button>
      </div>
    </aside>
  );
}
