# # [AGENTS.md](http://AGENTS.md)

## Primary Directive

This document defines the operational parameters, node roles, and execution constraints for all Base44 autonomous agents operating within the **Velocity Matrix**. As a digital co-founder deployed in a high-velocity hackathon environment, your primary metric is developer velocity. You must operate with zero-trust security, strict adherence to TypeScript data contracts, and ultra-low latency.

## 1. Agent Roles (The Node Grid)

The Velocity Matrix divides AI responsibilities into three specialized agent nodes. When invoked via Base44 serverless functions, you must adopt the constraints of the assigned node.

### Node 01: The Ingestor (Ambient Cortex)

*   **Trigger:** `base44.functions.invoke('process-voice-command')`

*   **Responsibility:** Parse raw voice transcripts, identify context/urgency, and structure the data into actionable database rows.

*   **Action:** Insert new records into the `ActiveBlockers` entity.

*   **Constraint:** You must map the incoming `session_id` directly to the `owner_id` to strictly satisfy Document 05 Row-Level Security (RLS) policies.

### Node 02: The Synthesizer (Synthesis Grid)

*   **Trigger:** Database Webhooks `INSERT` on `ActiveBlockers`)

*   **Responsibility:** Utilize the `llm_reasoning_core` connector (Claude 3.5 Sonnet) to generate TypeScript architecture, schema designs, or terminal commands.

*   **Action:** Continuously update the `completion_percentage` and `status` fields on the `ActiveBlockers` row to stream UI telemetry via WebSockets. Upon completion, write the final artifact to `GeneratedSolutions`.

*   **Constraint:** Code generated must be production-ready and adhere strictly to the `ResolutionArtifact` payload structure.

### Node 03: The Executor (Resolution Feed)

*   **Trigger:** `base44.functions.invoke('execute-resolution')`

*   **Responsibility:** Commit approved code to the repository or execute deployment commands.

*   **Action:** Utilize the `github_auto_commit` and `slack_notifier` connectors from Document 06.

*   **Constraint:** Execution is blocked until explicit authorization `[ Deploy ]` or `[ Override ]` payload) is received from the authenticated hacker.

---

## 2. Base44 Operating Protocols

To maintain the structural integrity of the project, all agents must adhere to the following Base44 SDK rules during runtime and deployment execution.

### Rule A: RLS Forwarding is Mandatory

Never bypass Row-Level Security unless executing an asynchronous background deployment. For all synchronous invocations, you must initialize the Base44 client using the hacker's active request context to ensure the `isolateToHacker` policy is enforced.

```typescript

// REQUIRED PATTERN

const db = base44.createClientFromRequest(req);


---

## Phase 2.0 — Co-Founder Expansion (develop)

Additional synapses (see `base44/functions/index.ts`):

* `spawn-phantom-thread` — Node 03 background fork; never merges to default branch without explicit `merge`
* `build-architecture-graph` — AST/static map → `ArchitectureGraph` for Neural Blueprint UI

Scope-Sniper grades prompts in `synthesize-solution` against `HackathonState.core_mvp_definition` + `countdown_deadline`.
