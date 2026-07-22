/**
 * Single-surface Cortex view-state machine (ui-plan §10 / F2).
 * Views are state transitions — not routes.
 */

export type CortexView =
  | "locked"
  | "ambient"
  | "synthesis"
  | "resolution"
  | "history";

/** Events that may advance the machine (auth, ingest, subscriptions, voice) */
export type CortexEvent =
  | { type: "AUTH_OK" }
  | { type: "AUTH_LOST" }
  | { type: "AUTH_LOADING" }
  | { type: "INGEST_ACKNOWLEDGED"; blockerId: string }
  | { type: "ARTIFACT_CREATED"; artifactId: string; blockerId?: string }
  | { type: "CANCEL" }
  | { type: "SHOW_HISTORY" }
  | { type: "HIDE_HISTORY" }
  | { type: "EXECUTION_SETTLED" };

export interface CortexContext {
  view: CortexView;
  activeBlockerId: string | null;
  activeArtifactId: string | null;
  /** View to restore when leaving history */
  historyReturnView: Exclude<CortexView, "history" | "locked"> | null;
}

export const INITIAL_CORTEX_CONTEXT: CortexContext = {
  view: "locked",
  activeBlockerId: null,
  activeArtifactId: null,
  historyReturnView: null,
};

/** Pure transition — UI holds no authoritative backend state */
export function reduceCortex(
  ctx: CortexContext,
  event: CortexEvent,
): CortexContext {
  switch (event.type) {
    case "AUTH_LOADING":
      return { ...INITIAL_CORTEX_CONTEXT, view: "locked" };

    case "AUTH_LOST":
      return { ...INITIAL_CORTEX_CONTEXT, view: "locked" };

    case "AUTH_OK":
      if (ctx.view === "locked") {
        return {
          ...ctx,
          view: "ambient",
          activeBlockerId: null,
          activeArtifactId: null,
          historyReturnView: null,
        };
      }
      return ctx;

    case "INGEST_ACKNOWLEDGED":
      if (ctx.view === "locked") return ctx;
      return {
        ...ctx,
        view: "synthesis",
        activeBlockerId: event.blockerId,
        activeArtifactId: null,
        historyReturnView: null,
      };

    case "ARTIFACT_CREATED":
      if (ctx.view === "locked") return ctx;
      return {
        ...ctx,
        view: "resolution",
        activeArtifactId: event.artifactId,
        activeBlockerId: event.blockerId ?? ctx.activeBlockerId,
        historyReturnView: null,
      };

    case "CANCEL":
      if (ctx.view === "locked") return ctx;
      return {
        ...ctx,
        view: "ambient",
        activeBlockerId: null,
        activeArtifactId: null,
        historyReturnView: null,
      };

    case "SHOW_HISTORY":
      if (ctx.view === "locked" || ctx.view === "history") return ctx;
      return {
        ...ctx,
        view: "history",
        historyReturnView: ctx.view,
      };

    case "HIDE_HISTORY":
      if (ctx.view !== "history") return ctx;
      return {
        ...ctx,
        view: ctx.historyReturnView ?? "ambient",
        historyReturnView: null,
      };

    case "EXECUTION_SETTLED":
      // Stay on resolution — committed badge / crimson error handled by F6 props
      if (ctx.view === "resolution") return ctx;
      return ctx;

    default:
      return ctx;
  }
}
