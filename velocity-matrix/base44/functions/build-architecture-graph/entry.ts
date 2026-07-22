/**
 * BE-3 — build / upsert ArchitectureGraph for Neural Blueprinting.
 * Endpoint: build-architecture-graph
 */
import { createClientFromRequest } from "npm:@base44/sdk";
import { buildArchitectureGraph } from "../../shared/architecture.ts";

interface Body {
  session_id?: string;
  force_refresh?: boolean;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user?.id) {
      return Response.json(
        {
          status: "rejected",
          message: "MATRIX_DENIED: Neural map access restricted.",
          telemetry: "MATRIX_DENIED",
        },
        { status: 200 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const states = await base44.entities.HackathonState.list();
    const state = states[0] as { session_id?: string } | undefined;
    const sessionId =
      (typeof body.session_id === "string" && body.session_id) ||
      state?.session_id ||
      "session";

    const existing = await base44.entities.ArchitectureGraph.filter({
      session_id: sessionId,
    });
    const prior = Array.isArray(existing) ? existing[0] : undefined;
    const priorHash =
      prior && typeof (prior as { source_hash?: string }).source_hash === "string"
        ? (prior as { source_hash: string }).source_hash
        : undefined;

    const graph = buildArchitectureGraph(sessionId, {
      forceRefresh: Boolean(body.force_refresh),
      ...(priorHash ? { priorHash } : {}),
    });

    let graphId: string;
    if (prior && (prior as { id?: string }).id) {
      graphId = (prior as { id: string }).id;
      await base44.entities.ArchitectureGraph.update(graphId, {
        generated_at: graph.generated_at,
        source_hash: graph.source_hash,
        nodes: graph.nodes,
        edges: graph.edges,
      });
    } else {
      const created = await base44.entities.ArchitectureGraph.create({
        owner_id: user.id,
        session_id: sessionId,
        generated_at: graph.generated_at,
        source_hash: graph.source_hash,
        nodes: graph.nodes,
        edges: graph.edges,
      });
      graphId = created.id as string;
    }

    return Response.json(
      {
        status: "success",
        graph_id: graphId,
        graph,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[build-architecture-graph]", message);
    return Response.json(
      { status: "error", handled: true, message },
      { status: 200 },
    );
  }
});
