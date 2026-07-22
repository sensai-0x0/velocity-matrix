/**
 * Mapper coverage for F3 realtime contract bridging.
 */
import { describe, expect, test } from "bun:test";
import {
  isDegradedBlocker,
  isFailedBlocker,
  synthesisStageLabel,
  toResolutionArtifact,
  toSynthesisStream,
  upsertFront,
} from "./matrixMappers";

describe("matrixMappers", () => {
  test("toSynthesisStream maps telemetry fields", () => {
    const stream = toSynthesisStream(
      {
        id: "b1",
        status: "generating_logic",
        completion_percentage: 55,
        current_focus: "Invoking llm",
        latency_ms: 120,
      },
      "fallback",
    );
    expect(stream.blocker_id).toBe("b1");
    expect(stream.status).toBe("generating_logic");
    expect(stream.completion_percentage).toBe(55);
    expect(synthesisStageLabel(stream.status)).toContain("SYNTHESIZING");
  });

  test("toResolutionArtifact packs payload", () => {
    const artifact = toResolutionArtifact(
      {
        id: "a1",
        blocker_reference: "b1",
        language: "typescript",
        code: "export const x = 1;",
        neural_summary: "add const",
        solution_type: "code_snippet",
      },
      "fallback",
      "2026-07-22T00:00:00.000Z",
    );
    expect(artifact.artifact_id).toBe("a1");
    expect(artifact.payload.code).toContain("export const");
    expect(artifact.available_actions).toContain("deploy");
  });

  test("upsertFront prepends and dedupes", () => {
    const next = upsertFront([{ id: "1" }, { id: "2" }], { id: "2", raw: 1 }, "2");
    expect(next.map((r) => r.id)).toEqual(["2", "1"]);
  });

  test("degraded / failed blocker detectors", () => {
    expect(
      isDegradedBlocker({
        current_focus: "Queued for retry",
        parsed_issue: "Degraded: LLM_TIMEOUT",
      }),
    ).toBe(true);
    expect(
      isFailedBlocker({
        is_resolved: false,
        parsed_issue: "System Error: boom",
      }),
    ).toBe(true);
    expect(isFailedBlocker({ is_resolved: true, parsed_issue: "ok" })).toBe(
      false,
    );
  });
});
