import { useCallback, useEffect, useState } from "react";
import { MatrixVoiceWave } from "./components/MatrixVoiceWave";
import { NeuralNode, neuralNodePropsFromArtifact } from "./components/NeuralNode";
import { SynthesisSpinner } from "./components/SynthesisSpinner";
import { LockedCortex } from "./components/LockedCortex";
import { ForgotPasswordPanel } from "./components/ForgotPasswordPanel";
import { ResetPasswordPanel } from "./components/ResetPasswordPanel";
import { CortexMockControls } from "./components/CortexMockControls";
import { MatrixDisconnectToast } from "./components/MatrixDisconnectToast";
import { AmbientVoicePanel } from "./components/AmbientVoicePanel";
import { MatrixHistoryPanel } from "./components/MatrixHistoryPanel";
import { NeuralBlueprintCanvas } from "./components/NeuralBlueprintCanvas";
import { ScopeInterruptStrip } from "./components/ScopeInterruptStrip";
import { PhantomPulse } from "./components/PhantomPulse";
import { MvpDeadlineSetup } from "./components/MvpDeadlineSetup";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAuthRoute } from "@/hooks/useAuthRoute";
import { useCortexView } from "@/hooks/useCortexView";
import { useMatrixSubscriptions } from "@/hooks/useMatrixSubscriptions";
import { usePhantomThreads } from "@/hooks/usePhantomThreads";
import { useVoiceIngest } from "@/hooks/useVoiceIngest";
import { useResolutionActions } from "@/hooks/useResolutionActions";
import { isDegradedBlocker, isFailedBlocker } from "@/lib/matrixMappers";
import { base44 } from "@/api/base44Client";
import { buildArchitectureGraph, executeArtifactAction, getOrCreateSessionId } from "@/api/matrixApi";
import type { ArchitectureGraphPayload } from "@/contracts/data_contracts";
import {
  isTactileMuted,
  setTactileMuted,
  unlockTactileAudio,
} from "@/audio/tactileTelemetry";

/**
 * React application root — Neuropunk Cortex + Phase 2.0 Co-Founder Expansion.
 * Auth: Base44 `/forgot-password` + `/reset-password` deep-link workflow.
 */
export default function App() {
  const { status, user, error, refresh, logout } = useAuthSession();
  const authRoute = useAuthRoute();
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
  const phantomThreads = usePhantomThreads(authenticated);

  const voice = useVoiceIngest({
    enabled: authenticated && view !== "locked",
    allowIngest: view === "ambient",
    dispatch,
  });
  const resolution = useResolutionActions({
    artifactId: context.activeArtifactId ?? latestArtifact?.artifact_id ?? null,
    dispatch,
  });

  const [graph, setGraph] = useState<ArchitectureGraphPayload | null>(null);
  const [graphBusy, setGraphBusy] = useState(false);
  const [audioMuted, setAudioMuted] = useState(isTactileMuted);

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

  useEffect(() => {
    if (!authenticated) return;
    const unlock = () => unlockTactileAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [authenticated]);

  const refreshGraph = useCallback(async () => {
    setGraphBusy(true);
    try {
      const result = await buildArchitectureGraph({
        session_id: getOrCreateSessionId(),
        force_refresh: true,
      });
      if (result.graph) setGraph(result.graph);
    } catch (err) {
      console.warn("[App] architecture graph refresh failed", err);
    } finally {
      setGraphBusy(false);
    }
  }, []);

  useEffect(() => {
    if (view === "blueprint" && !graph) void refreshGraph();
  }, [view, graph, refreshGraph]);

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

  const mergeReadyArtifact =
    latestArtifact?.merge_ready && latestArtifact.execution_mode === "phantom"
      ? latestArtifact
      : null;
  const mergeReadyRow = solutions.find(
    (s) => s.merge_ready && s.execution_mode === "phantom" && !s.is_discarded,
  );
  const mergeTarget = mergeReadyArtifact
    ? {
        id: mergeReadyArtifact.artifact_id,
        branch: mergeReadyArtifact.git_branch,
      }
    : mergeReadyRow?.id
      ? { id: mergeReadyRow.id, branch: mergeReadyRow.git_branch }
      : null;

  return (
    <main
      className="cortex-root"
      data-sdk-ready={sdkReady}
      data-cortex={view}
      data-auth={status}
      onPointerDown={() => unlockTactileAudio()}
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
              onClick={() => {
                const next = !audioMuted;
                setTactileMuted(next);
                setAudioMuted(next);
              }}
            >
              {audioMuted ? "[ Audio: off ]" : "[ Audio: on ]"}
            </button>
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

      {authenticated && <PhantomPulse threads={phantomThreads} />}

      {context.scopeInterrupt && (
        <ScopeInterruptStrip
          interrupt={context.scopeInterrupt}
          onDismiss={() => dispatch({ type: "DISMISS_SCOPE_WARNING" })}
          onOverride={() => {
            dispatch({ type: "DISMISS_SCOPE_WARNING" });
            void voice.submitText(
              `${activeBlocker?.raw_transcript ?? "continue"} — scope override build anyway`,
            );
          }}
          onUseShortcut={() => {
            const tag = context.scopeInterrupt?.shortcutSuggestion ?? "";
            dispatch({ type: "DISMISS_SCOPE_WARNING" });
            void voice.submitText(
              `Use Base44 shortcut instead: ${tag}`,
            );
          }}
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

        {/* Base44 requires exact /forgot-password and /reset-password paths */}
        {status !== "loading" &&
          !authenticated &&
          authRoute.path === "forgot-password" && <ForgotPasswordPanel />}

        {status !== "loading" &&
          !authenticated &&
          authRoute.path === "reset-password" && (
            <ResetPasswordPanel resetToken={authRoute.resetToken} />
          )}

        {view === "locked" &&
          status !== "loading" &&
          authRoute.path === "login" && (
            <LockedCortex error={error} onAuthenticated={refresh} />
          )}

        {view === "ambient" && <AmbientVoicePanel voice={voice} />}

        {view === "ambient" && authenticated && (
          <MvpDeadlineSetup visible />
        )}

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

        {view === "ambient" && mergeTarget && (
          <p className="phantom-merge-affordance" role="status">
            <button
              type="button"
              className="auth-affordance auth-affordance-inline"
              onClick={() => {
                void executeArtifactAction(mergeTarget.id, "merge");
              }}
            >
              {`[ Merge ${mergeTarget.branch ?? "phantom branch"} ]`}
            </button>
          </p>
        )}

        {view === "history" && (
          <MatrixHistoryPanel
            blockers={blockers}
            solutions={solutions}
            onReturn={() => dispatch({ type: "HIDE_HISTORY" })}
          />
        )}

        {view === "blueprint" && (
          <NeuralBlueprintCanvas
            graph={graph}
            busy={graphBusy}
            onRefresh={() => void refreshGraph()}
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
