/**
 * Node 02 LLM response normalization (B4).
 */
import type { ResolutionArtifact } from "./contracts.ts";

export interface LlmSolution {
  parsed_issue: string;
  solution_type: ResolutionArtifact["solution_type"];
  language: string;
  code: string;
  file_path?: string;
  neural_summary: string;
}

const SOLUTION_TYPES = new Set([
  "code_snippet",
  "architecture_diagram",
  "terminal_command",
]);

/** Normalize object | { text } | { data } | fenced JSON string → LlmSolution */
export function parseLlmResponse(raw: unknown): LlmSolution {
  let candidate: unknown = raw;

  if (candidate && typeof candidate === "object") {
    const o = candidate as Record<string, unknown>;
    if (typeof o.text === "string") candidate = o.text;
    else if (typeof o.content === "string") candidate = o.content;
    else if ("data" in o) candidate = o.data;
    else if ("response" in o) candidate = o.response;
  }

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonStr = (fenced?.[1] ?? trimmed).trim();
    candidate = JSON.parse(jsonStr);
  }

  if (!candidate || typeof candidate !== "object") {
    throw new Error("Unexpected LLM response shape");
  }

  const s = candidate as Record<string, unknown>;
  const solution_type = String(s.solution_type ?? "");
  if (!SOLUTION_TYPES.has(solution_type)) {
    throw new Error(`Invalid solution_type: ${solution_type}`);
  }
  if (typeof s.parsed_issue !== "string" || !s.parsed_issue.trim()) {
    throw new Error("Missing parsed_issue");
  }
  if (typeof s.language !== "string" || !s.language.trim()) {
    throw new Error("Missing language");
  }
  if (typeof s.code !== "string" || !s.code.trim()) {
    throw new Error("Missing code");
  }
  if (typeof s.neural_summary !== "string" || !s.neural_summary.trim()) {
    throw new Error("Missing neural_summary");
  }

  return {
    parsed_issue: s.parsed_issue.trim(),
    solution_type: solution_type as LlmSolution["solution_type"],
    language: s.language.trim(),
    code: s.code,
    neural_summary: s.neural_summary.trim(),
    ...(typeof s.file_path === "string" && s.file_path
      ? { file_path: s.file_path }
      : {}),
  };
}
