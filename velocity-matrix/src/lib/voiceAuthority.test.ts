/**
 * F7 — cancel / history phrase matching.
 */
import { describe, expect, test } from "bun:test";
import { matchVoiceAuthority } from "./voiceAuthority";

describe("matchVoiceAuthority", () => {
  test("cancel that → CANCEL", () => {
    expect(matchVoiceAuthority("Cancel that")).toEqual({ type: "CANCEL" });
    expect(matchVoiceAuthority("cancel that.")).toEqual({ type: "CANCEL" });
    expect(matchVoiceAuthority("please cancel that now")).toEqual({
      type: "CANCEL",
    });
  });

  test("show matrix history → SHOW_HISTORY", () => {
    expect(matchVoiceAuthority("Show matrix history")).toEqual({
      type: "SHOW_HISTORY",
    });
    expect(matchVoiceAuthority("open matrix history")).toEqual({
      type: "SHOW_HISTORY",
    });
  });

  test("hide history → HIDE_HISTORY", () => {
    expect(matchVoiceAuthority("hide history")).toEqual({
      type: "HIDE_HISTORY",
    });
    expect(matchVoiceAuthority("return to cortex")).toEqual({
      type: "HIDE_HISTORY",
    });
  });

  test("non-authority transcripts return null", () => {
    expect(matchVoiceAuthority("urgent CORS blocker")).toBeNull();
    expect(matchVoiceAuthority("")).toBeNull();
  });
});
