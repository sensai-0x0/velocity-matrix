/**
 * Architecture graph builder tests (BE-3).
 */
import { describe, expect, test } from "bun:test";
import {
  buildArchitectureGraph,
  clampGraph,
} from "./architecture.ts";

describe("architecture graph", () => {
  test("builds deterministic graph for session", () => {
    const g = buildArchitectureGraph("sess-1");
    expect(g.session_id).toBe("sess-1");
    expect(g.nodes.length).toBeGreaterThan(5);
    expect(g.edges.length).toBeGreaterThan(5);
    expect(g.nodes.some((n) => n.kind === "rls_policy")).toBe(true);
  });

  test("clamp respects soft budget", () => {
    const g = buildArchitectureGraph("s");
    const huge = {
      ...g,
      nodes: Array.from({ length: 500 }, (_, i) => ({
        id: `n${i}`,
        kind: "entity" as const,
        label: `n${i}`,
      })),
    };
    const clamped = clampGraph(huge);
    expect(clamped.nodes.length).toBeLessThanOrEqual(200);
  });
});
