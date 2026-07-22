/**
 * Subscribe to PhantomThreads for corner pulse (FE-1).
 */
import { useEffect, useState } from "react";
import type { RealtimeEvent } from "@base44/sdk";
import { base44 } from "@/api/base44Client";
import type { PhantomThreadStateStream } from "@/contracts/data_contracts";
import {
  asTelemetryType,
  playTelemetry,
} from "@/audio/tactileTelemetry";

interface PhantomRow {
  id?: string;
  status?: PhantomThreadStateStream["status"];
  completion_percentage?: number;
  steps?: PhantomThreadStateStream["steps"];
  git_branch?: string;
  error_trace?: string;
  telemetry_event?: string;
}

function toStream(row: PhantomRow): PhantomThreadStateStream | null {
  if (!row.id) return null;
  return {
    phantom_thread_id: row.id,
    status: row.status ?? "queued",
    completion_percentage: Number(row.completion_percentage ?? 0),
    steps: row.steps ?? [],
    ...(row.git_branch ? { git_branch: row.git_branch } : {}),
    ...(row.error_trace ? { error_trace: row.error_trace } : {}),
    ...(asTelemetryType(row.telemetry_event)
      ? { telemetry_event: asTelemetryType(row.telemetry_event)! }
      : {}),
  };
}

/** Live PhantomThreads list for authenticated cortex */
export function usePhantomThreads(enabled: boolean): PhantomThreadStateStream[] {
  const [threads, setThreads] = useState<PhantomThreadStateStream[]>([]);

  useEffect(() => {
    if (!enabled) {
      setThreads([]);
      return;
    }
    const entity = base44.entities.PhantomThreads;
    if (!entity) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;

    try {
      unsub = entity.subscribe((event: RealtimeEvent<PhantomRow>) => {
        if (cancelled) return;
        if (event.type === "delete") {
          setThreads((prev) =>
            prev.filter((t) => t.phantom_thread_id !== event.id),
          );
          return;
        }
        const stream = toStream(event.data ?? {});
        if (!stream) return;
        const tel = asTelemetryType(event.data?.telemetry_event);
        if (tel) playTelemetry(tel);
        setThreads((prev) => {
          const rest = prev.filter(
            (t) => t.phantom_thread_id !== stream.phantom_thread_id,
          );
          return [stream, ...rest];
        });
      });
    } catch (err) {
      console.warn("[usePhantomThreads]", err);
    }

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [enabled]);

  return threads;
}
