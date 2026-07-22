/**
 * Static architecture graph builder (BE-3) — deterministic map of Matrix synapses.
 * Soft caps mirror ARCHITECTURE_GRAPH_LIMITS in entities/schema.ts.
 */
import type { ArchitectureGraphPayload } from "./contracts.ts";

/** Soft UI budget — mirrors entities/schema ARCHITECTURE_GRAPH_LIMITS */
const MAX_NODES = 200;
const MAX_EDGES = 400;

/** Known Deno function → entity / connector edges for Velocity Matrix */
const STATIC_GRAPH: ArchitectureGraphPayload = {
  session_id: "",
  generated_at: 0,
  source_hash: "static-v1",
  nodes: [
    { id: "fn:process-voice-command", kind: "deno_fn", label: "process-voice-command" },
    { id: "fn:synthesize-solution", kind: "deno_fn", label: "synthesize-solution" },
    { id: "fn:execute-resolution", kind: "deno_fn", label: "execute-resolution" },
    { id: "fn:provision-hackathon-state", kind: "deno_fn", label: "provision-hackathon-state" },
    { id: "fn:spawn-phantom-thread", kind: "deno_fn", label: "spawn-phantom-thread" },
    { id: "fn:build-architecture-graph", kind: "deno_fn", label: "build-architecture-graph" },
    { id: "ent:HackathonState", kind: "entity", label: "HackathonState" },
    { id: "ent:ActiveBlockers", kind: "entity", label: "ActiveBlockers" },
    { id: "ent:GeneratedSolutions", kind: "entity", label: "GeneratedSolutions" },
    { id: "ent:PhantomThreads", kind: "entity", label: "PhantomThreads" },
    { id: "ent:ArchitectureGraph", kind: "entity", label: "ArchitectureGraph" },
    { id: "rls:isolateToHacker", kind: "rls_policy", label: "isolateToHacker" },
    { id: "conn:llm_reasoning_core", kind: "connector", label: "llm_reasoning_core" },
    { id: "conn:github_auto_commit", kind: "connector", label: "github_auto_commit" },
    { id: "conn:slack_notifier", kind: "connector", label: "slack_notifier" },
  ],
  edges: [
    { from: "fn:process-voice-command", to: "ent:ActiveBlockers", relation: "writes" },
    { from: "fn:process-voice-command", to: "fn:synthesize-solution", relation: "invokes" },
    { from: "fn:process-voice-command", to: "fn:spawn-phantom-thread", relation: "invokes" },
    { from: "fn:synthesize-solution", to: "ent:ActiveBlockers", relation: "reads" },
    { from: "fn:synthesize-solution", to: "ent:ActiveBlockers", relation: "writes" },
    { from: "fn:synthesize-solution", to: "ent:HackathonState", relation: "reads" },
    { from: "fn:synthesize-solution", to: "ent:GeneratedSolutions", relation: "writes" },
    { from: "fn:synthesize-solution", to: "conn:llm_reasoning_core", relation: "invokes" },
    { from: "fn:execute-resolution", to: "ent:GeneratedSolutions", relation: "reads" },
    { from: "fn:execute-resolution", to: "ent:GeneratedSolutions", relation: "writes" },
    { from: "fn:execute-resolution", to: "ent:HackathonState", relation: "reads" },
    { from: "fn:execute-resolution", to: "conn:github_auto_commit", relation: "invokes" },
    { from: "fn:execute-resolution", to: "conn:slack_notifier", relation: "invokes" },
    { from: "fn:provision-hackathon-state", to: "ent:HackathonState", relation: "writes" },
    { from: "fn:spawn-phantom-thread", to: "ent:PhantomThreads", relation: "writes" },
    { from: "fn:spawn-phantom-thread", to: "ent:GeneratedSolutions", relation: "writes" },
    { from: "fn:spawn-phantom-thread", to: "conn:github_auto_commit", relation: "invokes" },
    { from: "fn:build-architecture-graph", to: "ent:ArchitectureGraph", relation: "writes" },
    { from: "rls:isolateToHacker", to: "ent:HackathonState", relation: "secures" },
    { from: "rls:isolateToHacker", to: "ent:ActiveBlockers", relation: "secures" },
    { from: "rls:isolateToHacker", to: "ent:GeneratedSolutions", relation: "secures" },
    { from: "rls:isolateToHacker", to: "ent:PhantomThreads", relation: "secures" },
    { from: "rls:isolateToHacker", to: "ent:ArchitectureGraph", relation: "secures" },
  ],
};

/** Clamp graph to soft UI budget */
export function clampGraph(
  graph: ArchitectureGraphPayload,
): ArchitectureGraphPayload {
  return {
    ...graph,
    nodes: graph.nodes.slice(0, MAX_NODES),
    edges: graph.edges.slice(0, MAX_EDGES),
  };
}

/** Build (or refresh) architecture graph for a session */
export function buildArchitectureGraph(
  sessionId: string,
  options?: { forceRefresh?: boolean; priorHash?: string },
): ArchitectureGraphPayload {
  const sourceHash = STATIC_GRAPH.source_hash;
  if (
    !options?.forceRefresh &&
    options?.priorHash &&
    options.priorHash === sourceHash
  ) {
    return clampGraph({
      ...STATIC_GRAPH,
      session_id: sessionId,
      generated_at: Date.now(),
      source_hash: sourceHash,
    });
  }
  return clampGraph({
    ...STATIC_GRAPH,
    session_id: sessionId,
    generated_at: Date.now(),
    source_hash: sourceHash,
  });
}
