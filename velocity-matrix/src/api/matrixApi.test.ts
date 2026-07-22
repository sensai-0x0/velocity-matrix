/**
 * Typed invoke helper coverage for VoiceIngestionPayload construction.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { buildVoiceIngestionPayload } from "./matrixApi";

beforeAll(() => {
  const store = new Map<string, string>();
  // bun:test has no DOM — shim sessionStorage for session id helpers
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
  });
});

describe("buildVoiceIngestionPayload", () => {
  test("sets urgency from transcript keywords", () => {
    const payload = buildVoiceIngestionPayload("urgent auth blocker in RLS");
    expect(payload.urgency_flag).toBe(true);
    expect(payload.transcript).toContain("urgent");
    expect(payload.session_id.length).toBeGreaterThan(0);
    expect(payload.hacker_id).toBeUndefined();
  });

  test("keeps hacker_id optional unless provided", () => {
    const payload = buildVoiceIngestionPayload("normal transcript", {
      hackerId: "user_abc",
      contextTags: ["auth"],
    });
    expect(payload.hacker_id).toBe("user_abc");
    expect(payload.context_tags).toEqual(["auth"]);
    expect(payload.urgency_flag).toBe(false);
  });
});
