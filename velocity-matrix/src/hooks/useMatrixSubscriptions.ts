/**
 * Live entity subscriptions for ActiveBlockers + GeneratedSolutions (Doc 04 / F3).
 * Uses SDK subscribe(callback) — client-side filter for unresolved blockers.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeEvent } from "@base44/sdk";
import { base44 } from "@/api/base44Client";
import type {
  ResolutionArtifact,
  SynthesisStateStream,
} from "@/contracts/data_contracts";
import type { CortexEvent } from "@/cortex/cortexMachine";
import {
  type ActiveBlockerRow,
  type GeneratedSolutionRow,
  synthesisStageLabel,
  toResolutionArtifact,
  toSynthesisStream,
  upsertFront,
} from "@/lib/matrixMappers";
import {
  asTelemetryType,
  playTelemetry,
} from "@/audio/tactileTelemetry";

const RECONNECT_MS = 2_500;

function parseScopeWarningFocus(focus: string | undefined): {
  hoursRemaining: number;
  warningMessage: string;
  shortcutSuggestion?: string;
} | null {
  if (!focus || !focus.includes("SCOPE_WARNING")) return null;
  const hoursMatch = focus.match(/([\d.]+)h\s+left/i);
  const hoursRemaining = hoursMatch ? Number(hoursMatch[1]) : 0;
  const shortcutMatch = focus.match(/Shortcut:\s*(.+)$/i);
  const warningMessage = focus
    .replace(/^SCOPE_WARNING\s*·\s*/i, "")
    .replace(/\s*·\s*Shortcut:.*$/i, "")
    .trim();
  return {
    hoursRemaining,
    warningMessage: warningMessage || "High-friction request detected.",
    ...(shortcutMatch ? { shortcutSuggestion: shortcutMatch[1]!.trim() } : {}),
  };
}

export interface UseMatrixSubscriptionsOptions {
  enabled: boolean;
  /** Active blocker tracked by the Cortex machine (drives SynthesisStateStream) */
  activeBlockerId: string | null;
  dispatch: (event: CortexEvent) => void;
}

export interface UseMatrixSubscriptionsResult {
  blockers: ActiveBlockerRow[];
  solutions: GeneratedSolutionRow[];
  synthesis: SynthesisStateStream | null;
  latestArtifact: ResolutionArtifact | null;
  disconnectMessage: string | null;
  clearDisconnect: () => void;
  synthesisLabel: string;
}

/** Subscribe to matrix entities; upsert state; bridge create events into Cortex dispatch */
export function useMatrixSubscriptions({
  enabled,
  activeBlockerId,
  dispatch,
}: UseMatrixSubscriptionsOptions): UseMatrixSubscriptionsResult {
  const [blockers, setBlockers] = useState<ActiveBlockerRow[]>([]);
  const [solutions, setSolutions] = useState<GeneratedSolutionRow[]>([]);
  const [synthesis, setSynthesis] = useState<SynthesisStateStream | null>(null);
  const [latestArtifact, setLatestArtifact] =
    useState<ResolutionArtifact | null>(null);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(
    null,
  );
  const [epoch, setEpoch] = useState(0);

  const activeBlockerIdRef = useRef(activeBlockerId);
  activeBlockerIdRef.current = activeBlockerId;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const clearDisconnect = useCallback(() => setDisconnectMessage(null), []);

  useEffect(() => {
    if (!enabled) {
      setBlockers([]);
      setSolutions([]);
      setSynthesis(null);
      setLatestArtifact(null);
      return;
    }

    const ActiveBlockers = base44.entities.ActiveBlockers;
    const GeneratedSolutions = base44.entities.GeneratedSolutions;
    if (!ActiveBlockers || !GeneratedSolutions) {
      setDisconnectMessage(
        "MATRIX_DISCONNECT · entities unavailable — check VITE_BASE44_APP_ID",
      );
      return;
    }

    let cancelled = false;
    let unsubBlockers: (() => void) | undefined;
    let unsubSolutions: (() => void) | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleReconnect(reason: string) {
      if (cancelled) return;
      setDisconnectMessage(`MATRIX_DISCONNECT · reconnecting... (${reason})`);
      reconnectTimer = setTimeout(() => {
        if (!cancelled) setEpoch((n) => n + 1);
      }, RECONNECT_MS);
    }

    function onBlockerEvent(event: RealtimeEvent<ActiveBlockerRow>) {
      try {
        if (event.type === "delete") {
          setBlockers((prev) => prev.filter((b) => b.id !== event.id));
          return;
        }

        const row = { ...event.data, id: event.data?.id ?? event.id };

        // Doc 04: keep unresolved blockers in the live queue
        if (row.is_resolved === true) {
          setBlockers((prev) => prev.filter((b) => b.id !== event.id));
        } else {
          setBlockers((prev) => upsertFront(prev, row, event.id));
        }

        const stream = toSynthesisStream(row, event.id);
        if (
          !activeBlockerIdRef.current ||
          activeBlockerIdRef.current === stream.blocker_id
        ) {
          setSynthesis(stream);
        }

        const tel = asTelemetryType(row.telemetry_event);
        if (tel) playTelemetry(tel);

        const scope = parseScopeWarningFocus(row.current_focus);
        if (scope && (event.type === "create" || event.type === "update")) {
          playTelemetry("SCOPE_WARNING");
          dispatchRef.current({
            type: "SCOPE_WARNING",
            hoursRemaining: scope.hoursRemaining,
            warningMessage: scope.warningMessage,
            ...(scope.shortcutSuggestion
              ? { shortcutSuggestion: scope.shortcutSuggestion }
              : {}),
          });
        }

        if (event.type === "create") {
          const agent = row.assigned_agent ?? "";
          if (agent === "phantom_executor") {
            dispatchRef.current({
              type: "INGEST_ACKNOWLEDGED",
              blockerId: stream.blocker_id,
              execution: "phantom",
            });
          } else {
            dispatchRef.current({
              type: "INGEST_ACKNOWLEDGED",
              blockerId: stream.blocker_id,
              execution: "sync",
            });
          }
        }
      } catch (err) {
        console.error("Matrix Disconnect: Blocker Stream Failed", err);
        scheduleReconnect("blocker_handler");
      }
    }

    function onSolutionEvent(event: RealtimeEvent<GeneratedSolutionRow>) {
      try {
        if (event.type === "delete") {
          setSolutions((prev) => prev.filter((s) => s.id !== event.id));
          return;
        }

        const row = { ...event.data, id: event.data?.id ?? event.id };
        setSolutions((prev) => upsertFront(prev, row, event.id));

        // B5: discarded artifacts leave the active Resolution Feed
        if (row.is_discarded) {
          setLatestArtifact((prev) =>
            prev?.artifact_id === (row.id ?? event.id) ? null : prev,
          );
          return;
        }

        if (event.type === "create") {
          const artifact = toResolutionArtifact(
            row,
            event.id,
            event.timestamp || new Date().toISOString(),
          );
          const tel = asTelemetryType(row.telemetry_event);
          if (tel) playTelemetry(tel);
          else if (row.eval_status === "passing") playTelemetry("EVALS_PASSED");
          else playTelemetry("SYNTHESIS_COMPLETE");

          // Phantom merges stay ambient — only sync artifacts steal Resolution Feed
          if (row.execution_mode === "phantom") {
            setLatestArtifact(artifact);
            return;
          }

          setLatestArtifact(artifact);
          if (artifact.blocker_id) {
            dispatchRef.current({
              type: "ARTIFACT_CREATED",
              artifactId: artifact.artifact_id,
              blockerId: artifact.blocker_id,
            });
          } else {
            dispatchRef.current({
              type: "ARTIFACT_CREATED",
              artifactId: artifact.artifact_id,
            });
          }
        }
      } catch (err) {
        console.error("Matrix Disconnect: Solution Stream Failed", err);
        scheduleReconnect("solution_handler");
      }
    }

    try {
      unsubBlockers = ActiveBlockers.subscribe(onBlockerEvent);
      unsubSolutions = GeneratedSolutions.subscribe(onSolutionEvent);
      setDisconnectMessage(null);
    } catch (err) {
      console.error("Matrix Disconnect: subscribe failed", err);
      scheduleReconnect("subscribe");
    }

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        unsubBlockers?.();
      } catch {
        /* ignore */
      }
      try {
        unsubSolutions?.();
      } catch {
        /* ignore */
      }
    };
  }, [enabled, epoch]);

  // Keep synthesis stream aligned when Cortex switches active blocker
  useEffect(() => {
    if (!activeBlockerId) return;
    const match = blockers.find((b) => b.id === activeBlockerId);
    if (match) setSynthesis(toSynthesisStream(match, activeBlockerId));
  }, [activeBlockerId, blockers]);

  const synthesisLabel = synthesis
    ? synthesisStageLabel(synthesis.status)
    : ">> SYNTHESIZING...";

  return {
    blockers,
    solutions,
    synthesis,
    latestArtifact,
    disconnectMessage,
    clearDisconnect,
    synthesisLabel,
  };
}
