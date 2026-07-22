import { MatrixVoiceWave } from "./components/MatrixVoiceWave";
import { NeuralNode } from "./components/NeuralNode";
import { SynthesisSpinner } from "./components/SynthesisSpinner";
import { LockedCortex } from "./components/LockedCortex";
import { CortexMockControls } from "./components/CortexMockControls";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCortexView } from "@/hooks/useCortexView";
import { base44 } from "@/api/base44Client";

const SYNTHESIS_LABEL = ">> SYNTHESIZING_ARCHITECTURE...";

/**
 * React application root — Neuropunk Cortex surface.
 * F2: single-surface view machine driven by auth + dispatchable cortex events.
 */
export default function App() {
  const { status, user, error, refresh, logout } = useAuthSession();
  const { view, context, dispatch } = useCortexView(status);
  const sdkReady = base44.getConfig().appId !== "velocity-matrix-unset";
  const authenticated = status === "authenticated";

  return (
    <main
      className="cortex-root"
      data-sdk-ready={sdkReady}
      data-cortex={view}
      data-auth={status}
    >
      <header className="cortex-brand">
        <h1>Velocity Matrix</h1>
        <p>Ambient Cortex · Synthesis Grid · Resolution Feed</p>
        {authenticated && user && (
          <p className="cortex-session">
            <span>{user.email}</span>
            <button
              type="button"
              className="auth-affordance auth-affordance-inline"
              onClick={logout}
            >
              [ Logout ]
            </button>
          </p>
        )}
      </header>

      <section className="cortex-stage" aria-label="Cortex stage">
        <MatrixVoiceWave
          active={view === "ambient"}
          amplitude={view === "ambient" ? 0.55 : 0.25}
        />

        {status === "loading" && (
          <p className="cortex-probe" role="status">
            {">> PROBING_SESSION…"}
          </p>
        )}

        {view === "locked" && status !== "loading" && (
          <LockedCortex error={error} onAuthenticated={refresh} />
        )}

        {view === "ambient" && (
          <p className="cortex-ambient-hint" role="status">
            {">> INGESTING_AUDIO… ambient cortex unlocked"}
          </p>
        )}

        {view === "synthesis" && (
          <>
            <SynthesisSpinner synthesizing label={SYNTHESIS_LABEL} />
            <p className="cortex-probe" role="status">
              {context.activeBlockerId
                ? `blocker:${context.activeBlockerId}`
                : ">> AWAITING_BLOCKER_ID"}
            </p>
          </>
        )}

        {view === "resolution" && (
          <NeuralNode
            title="Resolution Feed"
            code={
              context.activeArtifactId
                ? `// artifact ${context.activeArtifactId}\n// awaiting F6 payload bind`
                : "// awaiting execution trace"
            }
          />
        )}

        {view === "history" && (
          <section className="cortex-history" aria-label="Matrix history">
            <p className="cortex-ambient-hint" role="status">
              {">> MATRIX_HISTORY · peripheral layer (F7 will bind rows)"}
            </p>
            <button
              type="button"
              className="auth-affordance"
              onClick={() => dispatch({ type: "HIDE_HISTORY" })}
            >
              [ Return ]
            </button>
          </section>
        )}
      </section>

      <CortexMockControls
        view={view}
        dispatch={dispatch}
        visible={authenticated}
      />
    </main>
  );
}
