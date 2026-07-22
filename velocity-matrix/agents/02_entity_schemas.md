# 02_entity_schemas.ts

## Purpose
This document defines the strict TypeScript NoSQL structures that act as the Velocity Matrix's short-term and long-term memory. It dictates the exact shape of the data stored in the Base44 database, allowing the Deno backend and the real-time frontend grid to share a strictly typed contract.

## Agent Implementation Instructions

To the agent executing this blueprint, write the entity definitions exactly as mapped below. 

### Schema Rules
- **Primary Keys:** Assume Base44 automatically generates an `id` (`_id` or `id` depending on the exact SDK version) for every entity. Do not manually declare standard ID fields unless creating a specific foreign key relation.
- **Data Types:** Use the `@base44/sdk/schema` primitives to ensure full compatibility with the Base44 real-time syncing engine.
- **Tenancy:** Every entity must include an `owner_id` to link records directly to the authenticated hacker. This is critical for the Row-Level Security (RLS) policies implemented in Document 05.

## Code Artifact

```typescript
import { entity, types } from '@base44/sdk/schema';

/**
 * HACKATHON_STATE
 * Represents the global context of the solo hacker's session.
 * Used by the AI consultant to understand the current overarching goal.
 */
export const HackathonState = entity({
  owner_id: types.string(), // The authenticated user's ID
  current_focus_area: types.string(), // e.g., "Setting up Stripe webhooks"
  last_active_timestamp: types.number(), // Unix epoch for timeout/idle tracking
});

/**
 * ACTIVE_BLOCKERS
 * The ingestion queue for voice commands and recognized hurdles.
 * Subscribed to by the UI to render the "red/unresolved" matrix grid nodes.
 */
export const ActiveBlockers = entity({
  owner_id: types.string(),
  raw_transcript: types.string(), // The literal text transcribed from voice
  parsed_issue: types.string().optional(), // The refined problem statement distilled by the LLM
  is_resolved: types.boolean().default(false), // Toggled to true once a solution is generated
});

/**
 * GENERATED_SOLUTIONS
 * The output artifacts created by the AI consultant.
 * Subscribed to by the UI to render the "green/resolved" matrix grid nodes with code snippets.
 */
export const GeneratedSolutions = entity({
  owner_id: types.string(),
  blocker_reference: types.reference('ActiveBlockers'), // Relational link to the blocker that triggered this
  typescript_code: types.string(), // The synthesized code artifact or terminal command
  has_been_committed: types.boolean().default(false), // Tracks if the GitHub connector has pushed this to the repo
});

---

## Phase 2.0 schema extensions (Co-Founder Expansion)

Pushable sources of truth: `base44/entities/*.jsonc` + `base44/entities/schema.ts`.

| Entity | Additions |
|--------|-----------|
| `HackathonState` | `countdown_deadline`, `core_mvp_definition`, `hours_remaining_cache`, `scope_mode` |
| `GeneratedSolutions` | `execution_mode`, phantom/merge fields, `eval_status`, `merge` action |
| `PhantomThreads` | New — background worker progress (RLS `isolateToHacker`) |
| `ArchitectureGraph` | New — Deno↔entity↔RLS graph snapshot (upsert per `session_id`; ≤200 nodes / ≤400 edges) |

Typed event/payload contracts: `base44/shared/contracts.ts` (`MatrixTelemetryEvent`, `ScopeGradeResult`, `PhantomThread*`, `ArchitectureGraphPayload`).
