/**
 * F2 exit criteria — walk the Cortex machine without a live backend.
 */
import { describe, expect, test } from "bun:test";
import {
  INITIAL_CORTEX_CONTEXT,
  reduceCortex,
} from "./cortexMachine";

describe("reduceCortex", () => {
  test("auth ok unlocks ambient from locked", () => {
    const next = reduceCortex(INITIAL_CORTEX_CONTEXT, { type: "AUTH_OK" });
    expect(next.view).toBe("ambient");
  });

  test("ingest → synthesis → artifact → resolution → cancel → ambient", () => {
    let ctx = reduceCortex(INITIAL_CORTEX_CONTEXT, { type: "AUTH_OK" });
    ctx = reduceCortex(ctx, {
      type: "INGEST_ACKNOWLEDGED",
      blockerId: "b1",
    });
    expect(ctx.view).toBe("synthesis");
    expect(ctx.activeBlockerId).toBe("b1");

    ctx = reduceCortex(ctx, {
      type: "ARTIFACT_CREATED",
      artifactId: "a1",
      blockerId: "b1",
    });
    expect(ctx.view).toBe("resolution");
    expect(ctx.activeArtifactId).toBe("a1");

    ctx = reduceCortex(ctx, { type: "CANCEL" });
    expect(ctx.view).toBe("ambient");
    expect(ctx.activeBlockerId).toBeNull();
  });

  test("history toggles and restores prior view", () => {
    let ctx = reduceCortex(INITIAL_CORTEX_CONTEXT, { type: "AUTH_OK" });
    ctx = reduceCortex(ctx, {
      type: "INGEST_ACKNOWLEDGED",
      blockerId: "b1",
    });
    ctx = reduceCortex(ctx, { type: "SHOW_HISTORY" });
    expect(ctx.view).toBe("history");
    expect(ctx.historyReturnView).toBe("synthesis");

    ctx = reduceCortex(ctx, { type: "HIDE_HISTORY" });
    expect(ctx.view).toBe("synthesis");
  });

  test("locked ignores ingest until authenticated", () => {
    const next = reduceCortex(INITIAL_CORTEX_CONTEXT, {
      type: "INGEST_ACKNOWLEDGED",
      blockerId: "b1",
    });
    expect(next.view).toBe("locked");
  });

  test("auth lost resets to locked", () => {
    let ctx = reduceCortex(INITIAL_CORTEX_CONTEXT, { type: "AUTH_OK" });
    ctx = reduceCortex(ctx, {
      type: "ARTIFACT_CREATED",
      artifactId: "a1",
    });
    ctx = reduceCortex(ctx, { type: "AUTH_LOST" });
    expect(ctx.view).toBe("locked");
    expect(ctx.activeArtifactId).toBeNull();
  });

  test("blueprint toggles and restores prior view", () => {
    let ctx = reduceCortex(INITIAL_CORTEX_CONTEXT, { type: "AUTH_OK" });
    ctx = reduceCortex(ctx, {
      type: "ARTIFACT_CREATED",
      artifactId: "a1",
    });
    ctx = reduceCortex(ctx, { type: "SHOW_BLUEPRINT" });
    expect(ctx.view).toBe("blueprint");
    expect(ctx.historyReturnView).toBe("resolution");

    ctx = reduceCortex(ctx, { type: "HIDE_BLUEPRINT" });
    expect(ctx.view).toBe("resolution");
  });

  test("scope warning sets peripheral interrupt without changing view", () => {
    let ctx = reduceCortex(INITIAL_CORTEX_CONTEXT, { type: "AUTH_OK" });
    ctx = reduceCortex(ctx, {
      type: "SCOPE_WARNING",
      hoursRemaining: 14,
      warningMessage: "Custom WebSocket chat is out of MVP.",
      shortcutSuggestion: "Use Base44 entity subscribe",
    });
    expect(ctx.view).toBe("ambient");
    expect(ctx.scopeInterrupt?.hoursRemaining).toBe(14);
    expect(ctx.scopeInterrupt?.shortcutSuggestion).toContain("Base44");

    ctx = reduceCortex(ctx, { type: "DISMISS_SCOPE_WARNING" });
    expect(ctx.scopeInterrupt).toBeNull();
  });


  test("phantom ingest stays on ambient", () => {
    let ctx = reduceCortex(INITIAL_CORTEX_CONTEXT, { type: "AUTH_OK" });
    ctx = reduceCortex(ctx, {
      type: "INGEST_ACKNOWLEDGED",
      blockerId: "ph1",
      execution: "phantom",
    });
    expect(ctx.view).toBe("ambient");
    expect(ctx.activeBlockerId).toBe("ph1");
  });
});
