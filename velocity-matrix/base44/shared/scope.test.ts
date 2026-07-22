/**
 * Scope-Sniper unit tests (BE-2).
 */
import { describe, expect, test } from "bun:test";
import {
  estimateFrictionHours,
  gradeScope,
  hoursRemaining,
  withinMvp,
} from "./scope.ts";

describe("scope-sniper", () => {
  test("detects websocket chat as high friction + shortcut", () => {
    const r = estimateFrictionHours(
      "I need a custom WebSocket chat system for the demo",
    );
    expect(r.hours).toBeGreaterThanOrEqual(4);
    expect(r.shortcut).toContain("subscribe");
  });

  test("withinMvp is dormant when definition empty", () => {
    expect(withinMvp("anything goes", "")).toBe(true);
  });

  test("gradeScope warns on friction and reports hours remaining", () => {
    const deadline = Date.now() + 14 * 3_600_000;
    const grade = gradeScope({
      transcript: "build kubernetes and rabbitmq from scratch",
      mvpDefinition: "stripe webhook deno route evals",
      countdownDeadline: deadline,
    });
    expect(grade.shouldWarn).toBe(true);
    expect(grade.hours_remaining ?? 0).toBeGreaterThan(13);
  });

  test("hoursRemaining clamps past deadlines to 0", () => {
    expect(hoursRemaining(Date.now() - 1000)).toBe(0);
  });

  test("scope override suppresses warning", () => {
    const grade = gradeScope({
      transcript: "custom websocket chat",
      mvpDefinition: "mvp core",
      scopeOverride: true,
    });
    expect(grade.shouldWarn).toBe(false);
  });
});
