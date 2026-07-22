/**
 * B4 LLM response shape hardening.
 */
import { describe, expect, test } from "bun:test";
import { parseLlmResponse } from "./llm";

const sample = {
  parsed_issue: "CORS blocker on /api",
  solution_type: "code_snippet" as const,
  language: "typescript",
  code: "export const ok = true;",
  neural_summary: "Add CORS headers",
};

describe("parseLlmResponse", () => {
  test("accepts plain object", () => {
    const out = parseLlmResponse(sample);
    expect(out.parsed_issue).toBe(sample.parsed_issue);
    expect(out.code).toContain("ok");
  });

  test("unwraps { text: jsonString }", () => {
    const out = parseLlmResponse({ text: JSON.stringify(sample) });
    expect(out.solution_type).toBe("code_snippet");
  });

  test("unwraps fenced markdown JSON", () => {
    const raw = ["```json", JSON.stringify(sample), "```"].join("\n");
    const out = parseLlmResponse(raw);
    expect(out.language).toBe("typescript");
  });

  test("rejects invalid solution_type", () => {
    expect(() =>
      parseLlmResponse({ ...sample, solution_type: "wasm_blob" }),
    ).toThrow(/Invalid solution_type/);
  });
});
