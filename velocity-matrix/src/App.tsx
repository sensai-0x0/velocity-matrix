import { MatrixVoiceWave } from "./components/MatrixVoiceWave";
import { NeuralNode, neuralNodePropsFromArtifact } from "./components/NeuralNode";
import { SynthesisSpinner } from "./components/SynthesisSpinner";
import { LockedCortex } from "./components/LockedCortex";
import { CortexMockControls } from "./components/CortexMockControls";
import { MatrixDisconnectToast } from "./components/MatrixDisconnectToast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCortexView } from "@/hooks/useCortexView";
import { useMatrixSubscriptions } from "@/hooks/useMatrixSubscriptions";
import { base44 } from "@/api/base44Client";

/**
 * React application root — Neuropunk Cortex surface.
 * F3: Base44 entity subscriptions drive synthesis telemetry + resolution artifacts.
 */
export default function App() {
  const { status, user, error, refresh, logout } = useAuthSession();
  const { view, context, dispatch } = useCortexView(status);
  const authenticated = status === "authenticated";
  const {
    synthesis,
    latestArtifact,
    blockers,
    solutions,
    disconnectMessage,
    clearDisconnect,
    synthesisLabel,
  } = useMatrixSubscriptions({
    enabled: authenticated,
    activeBlockerId: context.activeBlockerId,
    dispatch,
  });

  const sdkReady = base44.getConfig().appId !== "velocity-matrix-unset";

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
            {blockers.length > 0
              ? `>> INGESTING_AUDIO… ${blockers.length} open blocker(s)`
              : ">> INGESTING_AUDIO… ambient cortex unlocked"}
          </p>
        )}

        {view === "synthesis" && (
          <>
            <SynthesisSpinner
              synthesizing
              label={synthesisLabel}
              {...(synthesis != null
                ? {
                    progress: synthesis.completion_percentage,
                    status: synthesis.status,
                    focus: synthesis.current_focus,
                    latencyMs: synthesis.latency_ms,
                  }
                : {})}
            />
            <p className="cortex-probe" role="status">
              {synthesis?.current_focus ||
                (context.activeBlockerId
                  ? `blocker:${context.activeBlockerId}`
                  : ">> AWAITING_TELEMETRY")}
            </p>
          </>
        )}

        {view === "resolution" && (
          <NeuralNode
            {...(latestArtifact
              ? neuralNodePropsFromArtifact(latestArtifact)
              : {
                  title: "Resolution Feed",
                  code: context.activeArtifactId
                    ? `// artifact ${context.activeArtifactId}\n// awaiting F6 execute-resolution bind`
                    : "// awaiting execution trace",
                })}
            {...(synthesis != null
              ? { latencyMs: synthesis.latency_ms }
              : {})}
          />
        )}

        {view === "history" && (
          <section className="cortex-history" aria-label="Matrix history">
            <p className="cortex-ambient-hint" role="status">
              {">> MATRIX_HISTORY"}
            </p>
            <ul className="cortex-history-list">
              {solutions.slice(0, 8).map((s) => (
                <li key={s.id ?? s.neural_summary}>
                  <span className="history-bio">
                    {s.neural_summary || s.id || "solution"}
                  </span>
                </li>
              ))}
              {solutions.length === 0 && (
                <li className="cortex-probe">{"// no solutions yet"}</li>
              )}
            </ul>
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

      <MatrixDisconnectToast
        message={disconnectMessage}
        onDismiss={clearDisconnect}
      />
    </main>
  );
}
