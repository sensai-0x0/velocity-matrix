# Phase 2.0 Backend Plan — The Co-Founder Expansion

> **Status:** Ready for agent execution  
> **Surface:** `base44/entities/*`, `base44/functions/*`, `base44/shared/contracts.ts`, `agents/02_entity_schemas.md`, `agents/data-contracts.md`  
> **Depends on:** Phase 1 Node Grid (Ingestor / Synthesizer / Executor) fully deployed  
> **Companion:** [`phase2-frontend.md`](./phase2-frontend.md)  
> **Linear prefix:** `VM-P2-BE-*` (map to Linear IDs when synced)

Phase 2.0 backend teaches the matrix hackathon context: parallel background workers, MVP friction grading, live AST dependency graphs, and typed WebSocket telemetry events for audio cues.

---

## Agent Completion Protocol

**Every agent working this plan MUST:**

1. Pick the next unchecked child under an open parent (respect **Depends on**).
2. Move the child to `in_progress` (checkbox `[~]` or Linear `In Progress`).
3. Implement only that child's **Scope** — no drive-by refactors.
4. Verify **Acceptance Criteria** (local evals / typecheck / deploy smoke as listed).
5. Mark complete: change `[ ]` → `[x]`, append `Completed: YYYY-MM-DD · agent:<name>` under the child.
6. If blocked, add a `Blocked:` note with the dependency ID; do **not** mark parent complete.
7. Mark a **parent** `[x]` only when **all** of its children are `[x]`.
8. After any schema change, update `base44/entities/schema.ts` **and** `agents/02_entity_schemas.md` in the same task.
9. After any new event or payload, update `base44/shared/contracts.ts` **and** `src/contracts/data_contracts.ts` (coordinate with FE parent `VM-P2-FE-0`).
10. Never bypass RLS on sync paths — background Phantom Threads may use service context only when explicitly authorized in `BE-1.3`.

**Checkbox legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` cancelled

---

## Execution Order (Backend)

```
BE-0 Contracts & Schema Foundation
  → BE-2 Scope-Sniper (HackathonState + grader)   // unlocks FE Scope Warning
  → BE-1 Phantom Threads (fork + branch push)     // unlocks FE Phantom Indicator
  → BE-3 Neural Blueprinting (AST graph)          // unlocks FE Blueprint Graph
  → BE-4 Telemetry Events (MATRIX_* payloads)     // unlocks FE Tactile Audio
  → BE-5 Evals & Deploy Hardening
```

Frontend may stub UI against contracts after `BE-0`; do not ship audio/graph/merge UX until the matching BE parent is `[x]`.

---

## Parent BE-0 · Contracts & Schema Foundation

**Goal:** Extend Phase 1 entities and shared TypeScript contracts so all Phase 2 features share one typed surface.  
**Depends on:** Phase 1 schemas live (`HackathonState`, `ActiveBlockers`, `GeneratedSolutions`).

### [x] BE-0.1 — Extend `HackathonState` for MVP + deadline

- **Scope:** Add to entity + `schema.ts`:
  - `countdown_deadline: number` (Unix ms end of hackathon)
  - `core_mvp_definition: string` (text blob of in-scope MVP)
  - `hours_remaining_cache?: number` (optional denormalized for UI)
  - `scope_mode?: 'strict' | 'advisory'` (default `advisory`)
- **Acceptance Criteria:**
  - [x] Entity JSONC / schema deployable via Base44 CLI
  - [x] RLS still isolates by `owner_id`
  - [x] Docs: `agents/02_entity_schemas.md` updated
- **Completed:** 2026-07-22 · agent:cursor

### [x] BE-0.2 — Extend `GeneratedSolutions` for Phantom merge flow

- **Scope:** Add fields:
  - `execution_mode: 'sync' | 'phantom'`
  - `phantom_thread_id?: string`
  - `git_branch?: string`
  - `merge_ready: boolean` (default `false`)
  - `merge_status?: 'pending' | 'ready' | 'merged' | 'abandoned'`
  - `eval_status?: 'not_run' | 'passing' | 'failing'`
- **Acceptance Criteria:**
  - [x] Existing Phase 1 rows remain valid (defaults for new fields)
  - [x] `available_actions` may include `'merge'` when `merge_ready`
  - [x] Schema + docs synced
- **Completed:** 2026-07-22 · agent:cursor

### [x] BE-0.3 — New entity `PhantomThreads`

- **Scope:** Create `PhantomThreads` entity:
  - `owner_id`, `session_id`
  - `parent_blocker_id` (ref `ActiveBlockers`)
  - `brief: string` (multi-step task description)
  - `status: 'queued' | 'running' | 'compiling' | 'pushing' | 'complete' | 'failed'`
  - `steps: Array<{ id: string; label: string; status: string }>`
  - `completion_percentage: number`
  - `git_branch?: string`
  - `error_trace?: string`
  - `started_at`, `finished_at?: number`
- **Acceptance Criteria:**
  - [x] RLS `isolateToHacker` on all ops
  - [x] Subscribable for UI pulse indicator
  - [x] Listed in `ENTITY_NAMES`
- **Completed:** 2026-07-22 · agent:cursor

### [x] BE-0.4 — New entity `ArchitectureGraph`

- **Scope:** Store live dependency graph snapshots:
  - `owner_id`, `session_id`
  - `generated_at: number`
  - `nodes: Array<{ id: string; kind: 'deno_fn' | 'entity' | 'rls_policy' | 'connector'; label: string; meta?: Record<string, unknown> }>`
  - `edges: Array<{ from: string; to: string; relation: 'reads' | 'writes' | 'invokes' | 'secures' }>`
  - `source_hash: string` (invalidate when code changes)
- **Acceptance Criteria:**
  - [x] One active graph per `session_id` (upsert pattern documented)
  - [x] Payload size guarded (max nodes/edges documented)
- **Completed:** 2026-07-22 · agent:cursor

### [x] BE-0.5 — Shared contracts: Matrix telemetry + Phase 2 payloads

- **Scope:** Add to `base44/shared/contracts.ts` (+ mirror FE):
  - `PhantomThreadSpawnPayload` / `PhantomThreadStateStream`
  - `ScopeGradeResult` (`friction_hours`, `within_mvp`, `warning_message`, `shortcut_suggestion?`)
  - `ArchitectureGraphPayload`
  - `MatrixTelemetryEvent` union:
    - `PHANTOM_RUNNING` | `PHANTOM_COMPILING` | `SYNTHESIS_COMPLETE` | `EVALS_PASSED` | `EVALS_FAILED` | `MATRIX_DENIED` | `SCOPE_WARNING` | `BRANCH_READY`
- **Acceptance Criteria:**
  - [x] Strict discriminated unions, no `any`
  - [x] Event names stable — FE audio map keys these strings
- **Completed:** 2026-07-22 · agent:cursor

**Parent complete when:** all BE-0.* `[x]`

---

## Parent BE-1 · Phantom Threads (Async Autonomous Workers)

**Goal:** Node 03 forks multi-step background work, streams progress on `PhantomThreads`, pushes a branch, and flags `GeneratedSolutions` for 1-click merge.  
**Depends on:** `BE-0` complete.  
**Unlocks FE:** `FE-1` Phantom Thread UX.

### [ ] BE-1.1 — Intent router: detect Phantom spawn in voice pipeline

- **Scope:** In `process-voice-command` (or post-parse synthesizer step), detect phrases / structured intent for background work (`"spin up a Phantom Thread"`, `"in the background"`, multi-step briefs). Set `execution_mode: 'phantom'` on the blocker path instead of sync synthesis-only.
- **Acceptance Criteria:**
  - [ ] Sync path unchanged for normal blockers
  - [ ] Phantom path creates `ActiveBlockers` + `PhantomThreads` row (`status: queued`)
  - [ ] Returns `assigned_agent` indicating phantom executor
- **Completed:**

### [ ] BE-1.2 — `spawn-phantom-thread` Deno function

- **Scope:** New function `base44/functions/spawn-phantom-thread/entry.ts`:
  - Input: `{ blocker_id, brief, steps? }`
  - Creates/updates `PhantomThreads`
  - Emits `PHANTOM_RUNNING` telemetry (via entity update that FE maps)
- **Acceptance Criteria:**
  - [ ] Registered in `base44/functions/index.ts`
  - [ ] RLS via `createClientFromRequest`
  - [ ] Always HTTP 200 with handled errors (Phase 1 resilience rule)
- **Completed:**

### [ ] BE-1.3 — Background worker loop (Node 03 fork)

- **Scope:** Implement async step runner that:
  1. Updates `steps[]` + `completion_percentage` + `status`
  2. Invokes synthesizer / connectors per step (code gen, Deno route scaffold, evals)
  3. On compile-like steps set `status: 'compiling'` → FE hum cue
  4. On failure set `failed` + `error_trace` + `MATRIX_DENIED` or `EVALS_FAILED` event fields
- **Acceptance Criteria:**
  - [ ] Document when service-role vs request-context is allowed
  - [ ] Idempotent step retries (no duplicate branch pushes)
  - [ ] Progress visible via `PhantomThreads.subscribe()`
- **Completed:**

### [ ] BE-1.4 — Silent git branch push + merge-ready flag

- **Scope:** On success:
  - Push artifacts via `github_auto_commit` to branch `phantom/<thread_id>-<slug>`
  - Write/update `GeneratedSolutions` with `merge_ready: true`, `git_branch`, `execution_mode: 'phantom'`, `eval_status`
  - Set `PhantomThreads.status: 'complete'`
  - Emit `BRANCH_READY`
- **Acceptance Criteria:**
  - [ ] Never push to `main` / default branch from Phantom path
  - [ ] `has_been_committed` reflects branch push (not merge)
  - [ ] Slack notifier optional, non-blocking
- **Completed:**

### [ ] BE-1.5 — `merge-phantom-branch` Deno function

- **Scope:** `execute-resolution` extension or new `merge-phantom-branch`:
  - Requires explicit `action_taken: 'merge'` from authenticated hacker
  - Opens PR or fast-forwards per connector capability; updates `merge_status: 'merged'`
- **Acceptance Criteria:**
  - [ ] Blocked without explicit authorization (AGENTS.md Node 03 constraint)
  - [ ] Returns `ExecutionResult` with PR/deploy URL
- **Completed:**

**Parent complete when:** all BE-1.* `[x]`

---

## Parent BE-2 · Scope-Sniper (Aggressive MVP Enforcement)

**Goal:** Grade every prompt against `core_mvp_definition` + time remaining; emit warnings / shortcuts when friction is high.  
**Depends on:** `BE-0.1`, `BE-0.5`.  
**Unlocks FE:** `FE-2` Scope Warning UI.

### [ ] BE-2.1 — Session bootstrap: deadline + MVP blob

- **Scope:** On first login / session seed, require or default:
  - `countdown_deadline` (from voice `"hackathon ends Sunday 5pm"` or UI-set)
  - `core_mvp_definition` (from voice `"MVP is X"` or seeded template)
- **Acceptance Criteria:**
  - [ ] Edge helper to update these fields without full voice round-trip
  - [ ] Hours remaining computable server-side
- **Completed:**

### [ ] BE-2.2 — Friction estimator in Synthesis Grid (Node 02)

- **Scope:** Before full code gen in `synthesize-solution`, call LLM (or heuristic+LLM) to produce `ScopeGradeResult`:
  - Estimated `friction_hours`
  - `within_mvp: boolean`
  - Divergence score vs `core_mvp_definition`
  - Optional `shortcut_suggestion` (Base44-native alternative)
- **Acceptance Criteria:**
  - [ ] Threshold: warn when `friction_hours >= 4` **or** `within_mvp === false`
  - [ ] Does not hard-block in `advisory` mode; `strict` mode may reject synthesis
  - [ ] Grade stored on blocker or side field for audit
- **Completed:**

### [ ] BE-2.3 — Warning protocol payload

- **Scope:** When threshold hit:
  - Update blocker `status` / `current_focus` with warning copy
  - Emit telemetry type `SCOPE_WARNING` carrying remaining hours + shortcut
  - Still allow override path (user insists)
- **Acceptance Criteria:**
  - [ ] Copy includes remaining hours from `countdown_deadline`
  - [ ] Override creates blocker tag `scope_override: true`
  - [ ] Contract documented for FE toast / cortex interrupt
- **Completed:**

### [ ] BE-2.4 — Shortcut library stubs

- **Scope:** Maintain a small map of high-friction asks → Base44 shortcuts (e.g. custom WS chat → Base44 realtime entity subscribe). Return in `shortcut_suggestion`.
- **Acceptance Criteria:**
  - [ ] At least 5 shortcut mappings in code or config
  - [ ] Unknown high-friction asks still get generic simplify recommendation
- **Completed:**

**Parent complete when:** all BE-2.* `[x]`

---

## Parent BE-3 · Neural Blueprinting (AST → Dependency Graph)

**Goal:** Edge function parses deployed / workspace code AST and upserts `ArchitectureGraph` for the UI WebGL canvas.  
**Depends on:** `BE-0.4`, `BE-0.5`.  
**Unlocks FE:** `FE-3` Blueprint view.

### [ ] BE-3.1 — `build-architecture-graph` Deno function

- **Scope:** New function that:
  - Reads registered Deno functions + entity schemas + RLS policy names
  - Produces nodes/edges JSON per `ArchitectureGraph` schema
  - Upserts by `session_id` + `source_hash`
- **Acceptance Criteria:**
  - [ ] Triggerable by voice intent `"visualize the data flow"` via process-voice-command router
  - [ ] Also runnable on deploy webhook / manual invoke
  - [ ] Completes within latency budget suitable for hackathon UI (< ~5s typical)
- **Completed:**

### [ ] BE-3.2 — Lightweight AST / static parse pipeline

- **Scope:** Implement parser suitable for Deno TS entrypoints (imports, `entities.*` calls, connector invokes). Prefer deterministic static analysis over full typechecker.
- **Acceptance Criteria:**
  - [ ] Maps functions → entities they read/write
  - [ ] Maps entities → RLS policy nodes
  - [ ] Degrades gracefully on parse failure (partial graph + warning)
- **Completed:**

### [ ] BE-3.3 — Graph invalidation + refresh

- **Scope:** Recompute when `source_hash` changes (file set hash or deploy version). Expose `force_refresh` flag.
- **Acceptance Criteria:**
  - [ ] Stale graphs not served as fresh without hash check
  - [ ] FE can subscribe to `ArchitectureGraph` updates
- **Completed:**

**Parent complete when:** all BE-3.* `[x]`

---

## Parent BE-4 · Tactile Telemetry Event Emission

**Goal:** Backend emits stable event-type fields so the UI can map Web Audio buffers without parsing free text.  
**Depends on:** `BE-0.5`.  
**Unlocks FE:** `FE-4` Audio layer.

### [ ] BE-4.1 — Telemetry field on mutating entities

- **Scope:** Ensure updates to `ActiveBlockers`, `PhantomThreads`, `GeneratedSolutions` include a machine-readable `telemetry_event?: MatrixTelemetryEvent['type']` (or parallel `MatrixEvents` entity if cleaner).
- **Acceptance Criteria:**
  - [ ] Every critical path emits exactly one event type
  - [ ] `MATRIX_DENIED` on RLS / auth denial paths
  - [ ] `SYNTHESIS_COMPLETE` / `EVALS_PASSED` / `EVALS_FAILED` wired
- **Completed:**

### [ ] BE-4.2 — Eval runner hook for Phantom + sync paths

- **Scope:** After artifact generation, run existing `evals/` suite (or subset); set `eval_status` and emit pass/fail telemetry.
- **Acceptance Criteria:**
  - [ ] Click cue path: `EVALS_PASSED` only when green
  - [ ] Failures do not crash client (200 + handled)
- **Completed:**

**Parent complete when:** all BE-4.* `[x]`

---

## Parent BE-5 · Evals, Security & Deploy Hardening

**Goal:** Phase 2 does not regress Phase 1 zero-trust or deploy sequence.  
**Depends on:** BE-1…BE-4 largely complete.

### [ ] BE-5.1 — RLS policies for new entities

- **Scope:** Extend `base44/entities/security.ts` / Doc 05 for `PhantomThreads`, `ArchitectureGraph`, new columns.
- **Acceptance Criteria:**
  - [ ] Cross-hacker reads impossible under test
  - [ ] Service-role phantom worker documented and scoped
- **Completed:**

### [ ] BE-5.2 — Backend evals for Phase 2 contracts

- **Scope:** Add eval cases: phantom spawn → branch fields; scope grade threshold; graph shape; telemetry enum exhaustiveness.
- **Acceptance Criteria:**
  - [ ] Documented in `evals/`
  - [ ] CI or local script runnable via bun
- **Completed:**

### [ ] BE-5.3 — Update agent docs & function index

- **Scope:** Update `AGENTS.md` Node 03 (phantom fork), Doc 02/03/06 as needed, `functions/index.ts` with new synapses.
- **Acceptance Criteria:**
  - [ ] New triggers listed with contracts
  - [ ] Deployment order notes Phase 2 schema before new functions
- **Completed:**

**Parent complete when:** all BE-5.* `[x]`

---

## Backend Definition of Done (Phase 2.0)

- [ ] All parents BE-0…BE-5 marked `[x]`
- [ ] No Phantom path can merge to default branch without explicit hacker `merge`
- [ ] Scope-Sniper grades every synthesis prompt when MVP + deadline set
- [ ] Architecture graph upsert works from voice trigger
- [ ] Telemetry event types match FE audio map 1:1
- [ ] Companion FE plan can complete without further contract churn

---

## Quick Traceability Matrix

| Pillar | Backend parents | Primary functions / entities |
|--------|-----------------|------------------------------|
| Phantom Threads | BE-0, BE-1, BE-4, BE-5 | `spawn-phantom-thread`, `PhantomThreads`, `GeneratedSolutions` |
| Scope-Sniper | BE-0, BE-2 | `HackathonState`, `synthesize-solution` |
| Neural Blueprinting | BE-0, BE-3 | `build-architecture-graph`, `ArchitectureGraph` |
| Tactile Telemetry | BE-0, BE-4 | `MatrixTelemetryEvent` on entity updates |
