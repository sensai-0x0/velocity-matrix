import { useEffect } from "react";
import { MatrixVoiceWave } from "./components/MatrixVoiceWave";
import { NeuralNode, neuralNodePropsFromArtifact } from "./components/NeuralNode";
import { SynthesisSpinner } from "./components/SynthesisSpinner";
import { LockedCortex } from "./components/LockedCortex";
import { CortexMockControls } from "./components/CortexMockControls";
import { MatrixDisconnectToast } from "./components/MatrixDisconnectToast";
import { AmbientVoicePanel } from "./components/AmbientVoicePanel";
import { MatrixHistoryPanel } from "./components/MatrixHistoryPanel";
import { NeuralBlueprintStub } from "./components/NeuralBlueprintStub";
import { ScopeInterruptStrip } from "./components/ScopeInterruptStrip";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCortexView } from "@/hooks/useCortexView";
import { useMatrixSubscriptions } from "@/hooks/useMatrixSubscriptions";
import { useVoiceIngest } from "@/hooks/useVoiceIngest";
import { useResolutionActions } from "@/hooks/useResolutionActions";
import { isDegradedBlocker, isFailedBlocker } from "@/lib/matrixMappers";
import { base44 } from "@/api/base44Client";

/**
 * React application root — Neuropunk Cortex surface.
 * F7 + Phase 2 shell hooks (blueprint view, scope interrupt strip).
 */
export default function App() {
  const { status, user, error, refresh, logout } = useAuthSession();
  const { view, context, dispatch } = useCortexView(status);
  const authenticated = status === "authenticated";
  const {
    synthesis,
    latestArtifact,
    solutions,
    blockers,
    disconnectMessage,
    clearDisconnect,
  } = useMatrixSubscriptions({
    enabled: authenticated,
    activeBlockerId: context.activeBlockerId,
    dispatch,
  });

  // Listen on all unlocked views; only Ambient submits ingest payloads
  const voice = useVoiceIngest({
    enabled: authenticated && view !== "locked",
    allowIngest: view === "ambient",
    dispatch,
  });
  const resolution = useResolutionActions({
    artifactId: context.activeArtifactId ?? latestArtifact?.artifact_id ?? null,
    dispatch,
  });

  const artifactId = latestArtifact?.artifact_id ?? null;
  useEffect(() => {
    resolution.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactId]);

  useEffect(() => {
    if (view !== "blueprint") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "HIDE_BLUEPRINT" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, dispatch]);

  const activeBlocker =
    blockers.find((b) => b.id === context.activeBlockerId) ?? blockers[0];
  const degraded = isDegradedBlocker(activeBlocker);
  const failed = isFailedBlocker(activeBlocker);

  const sdkReady = base44.getConfig().appId !== "velocity-matrix-unset";
  const waveActive = view === "ambient" && (voice.listening || voice.submitting);
  const waveAmplitude =
    view === "ambient" ? Math.max(0.35, voice.amplitude) : 0.25;
  const authorityHint =
    view === "synthesis" || view === "resolution"
      ? '>> VOICE · "Cancel that" · "Show matrix history"'
      : null;

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

      {context.scopeInterrupt && (
        <ScopeInterruptStrip
          interrupt={context.scopeInterrupt}
          onDismiss={() => dispatch({ type: "DISMISS_SCOPE_WARNING" })}
        />
      )}

      <section className="cortex-stage" aria-label="Cortex stage">
        {view !== "blueprint" && (
          <MatrixVoiceWave
            active={waveActive}
            amplitude={waveAmplitude}
            urgency={view === "ambient" && voice.urgency}
          />
        )}

        {status === "loading" && (
          <p className="cortex-probe" role="status">
            {">> PROBING_SESSION…"}
          </p>
        )}

        {view === "locked" && status !== "loading" && (
          <LockedCortex error={error} onAuthenticated={refresh} />
        )}

        {view === "ambient" && <AmbientVoicePanel voice={voice} />}

        {authorityHint && (
          <p className="cortex-authority-hint" role="status">
            {authorityHint}
          </p>
        )}

        {view === "synthesis" && (
          <SynthesisSpinner
            synthesizing={!failed}
            degraded={degraded}
            failed={failed}
            {...(synthesis != null
              ? {
                  progress: synthesis.completion_percentage,
                  status: synthesis.status,
                  latencyMs: synthesis.latency_ms,
                  ...(() => {
                    const focus =
                      failed || degraded
                        ? activeBlocker?.parsed_issue ||
                          synthesis.current_focus
                        : synthesis.current_focus;
                    return focus ? { focus } : {};
                  })(),
                }
              : (() => {
                  const focus =
                    activeBlocker?.parsed_issue ||
                    activeBlocker?.current_focus;
                  return focus ? { focus } : {};
                })())}
          />
        )}

        {view === "resolution" && (
          <NeuralNode
            {...(latestArtifact
              ? neuralNodePropsFromArtifact(latestArtifact)
              : {
                  title: "Resolution Feed",
                  code: context.activeArtifactId
                    ? `// artifact ${context.activeArtifactId}`
                    : "",
                })}
            {...(synthesis != null
              ? { latencyMs: synthesis.latency_ms }
              : {})}
            committed={resolution.committed}
            busy={resolution.busy}
            {...(resolution.deploymentUrl
              ? { deploymentUrl: resolution.deploymentUrl }
              : {})}
            {...(resolution.errorTrace
              ? { errorTrace: resolution.errorTrace }
              : {})}
            onAction={resolution.handleAction}
          />
        )}

        {view === "history" && (
          <MatrixHistoryPanel
            blockers={blockers}
            solutions={solutions}
            onReturn={() => dispatch({ type: "HIDE_HISTORY" })}
          />
        )}

        {view === "blueprint" && (
          <NeuralBlueprintStub
            onExit={() => dispatch({ type: "HIDE_BLUEPRINT" })}
          />
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
