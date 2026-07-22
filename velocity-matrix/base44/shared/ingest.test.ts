/**
 * B3 ingest keyword enrichment.
 */
import { describe, expect, test } from "bun:test";
import {
  deriveContextTags,
  deriveUrgency,
  mergeContextTags,
  resolveUrgency,
} from "./ingest";

describe("ingest helpers", () => {
  test("urgency fires on stress keywords", () => {
    expect(deriveUrgency("the deploy is a blocker, fix ASAP")).toBe(true);
    expect(deriveUrgency("casual hello")).toBe(false);
  });

  test("client cannot suppress keyword urgency", () => {
    expect(resolveUrgency("urgent CORS blocker", false)).toBe(true);
    expect(resolveUrgency("hello world", true)).toBe(true);
    expect(resolveUrgency("hello world", false)).toBe(false);
    expect(resolveUrgency("hello world", undefined)).toBe(false);
  });

  test("context tags from transcript", () => {
    expect(deriveContextTags("fix CORS on the routing layer")).toContain(
      "routing",
    );
    expect(deriveContextTags("configure oauth login")).toContain("auth");
  });

  test("merge dedupes client + derived", () => {
    const tags = mergeContextTags("oauth login", ["auth", "custom"]);
    expect(tags).toContain("auth");
    expect(tags).toContain("custom");
    expect(tags.filter((t) => t === "auth")).toHaveLength(1);
  });
});
