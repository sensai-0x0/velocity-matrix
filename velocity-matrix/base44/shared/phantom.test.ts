/**
 * Phantom intent helpers (BE-1).
 */
import { describe, expect, test } from "bun:test";
import {
  defaultPhantomSteps,
  detectPhantomIntent,
  phantomBranchName,
} from "./phantom.ts";

describe("phantom", () => {
  test("detects phantom spawn phrases", () => {
    expect(
      detectPhantomIntent(
        "Matrix, spin up a Phantom Thread to write the Stripe webhook",
      ),
    ).toBe(true);
    expect(detectPhantomIntent("fix the button color")).toBe(false);
  });

  test("branch name is safe", () => {
    const b = phantomBranchName("abc-123-xyz", "Stripe Webhook!!");
    expect(b.startsWith("phantom/")).toBe(true);
    expect(b).not.toMatch(/\s/);
  });

  test("default steps include evals + push", () => {
    const steps = defaultPhantomSteps("write stripe webhook");
    expect(steps.some((s) => /eval/i.test(s.label))).toBe(true);
    expect(steps.some((s) => /push/i.test(s.label))).toBe(true);
  });
});
