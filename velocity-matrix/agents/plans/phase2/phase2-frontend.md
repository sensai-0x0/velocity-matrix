# Phase 2.0 Frontend Plan — The Co-Founder Expansion

> **Status:** Ready for agent execution  
> **Surface:** `src/**`, `src/contracts/data_contracts.ts`, `agents/ui/ui-plan-velocity-matrix.md`, Neuropunk tokens in `src/index.css`  
> **Depends on:** Phase 1 UI (Ambient Cortex / Synthesis Grid / Resolution Feed)  
> **Companion:** [`phase2-backend.md`](./phase2-backend.md)  
> **Linear prefix:** `VM-P2-FE-*` (map to Linear IDs when synced)

Phase 2.0 frontend shifts the UI from “render what the matrix was told” to contextual co-founder UX: parallel Phantom indicators, MVP interrupt warnings, interactive architecture graphs, and ambient audio telemetry — without turning the void canvas into a dashboard.

---

## Agent Completion Protocol

**Every agent working this plan MUST:**

1. Confirm the matching **backend parent** is `[x]` (or contracts from `BE-0` are merged) before implementing non-stub UI. Stubbing against `data_contracts.ts` is allowed after `BE-0.5`.
2. Pick the next unchecked child under an open parent (respect **Depends on**).
3. Move child to `in_progress` (`[~]` or Linear `In Progress`).
4. Implement only that child's **Scope** — preserve Neuropunk rules from `agents/ui/ui-plan-velocity-matrix.md` (void canvas, mono type, no card clutter, crimson/bio tokens).
5. Verify **Acceptance Criteria** (visual + interaction + subscription cleanup).
6. Mark complete: `[ ]` → `[x]`, append `Completed: YYYY-MM-DD · agent:<name>`.
7. If blocked on backend, write `Blocked: BE-x.y` — do not invent fake WebSocket payloads in production paths.
8. Mark **parent** `[x]` only when all children are `[x]`.
9. Keep contracts in sync with `base44/shared/contracts.ts` via `FE-0`.
10. Prefer peripheral / ambient UI (corner pulse, audio, interrupt strip) over new full-screen chrome.

**Checkbox legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` cancelled

---

## Execution Order (Frontend)

```
FE-0 Contracts + design tokens
  → FE-2 Scope-Sniper interrupt     // needs BE-2 (or stub ScopeGradeResult)
  → FE-1 Phantom Thread chrome      // needs BE-1 (or stub PhantomThreads)
  → FE-4 Tactile Telemetry audio    // needs BE-4 event names stable
  → FE-3 Neural Blueprint canvas    // needs BE-3 graph payload
  → FE-5 Integration polish + a11y
```

**Aesthetic constraint:** Phase 2 features must feel like ambient cortex extensions, not a second product shell. One composition; history stays peripheral.

---

## Parent FE-0 · Contracts, Tokens & View Shell Hooks

**Goal:** Frontend can type Phase 2 payloads and mount feature surfaces without layout regressions.  
**Depends on:** `BE-0.5` (or parallel stub with identical names).

### [x] FE-0.1 — Mirror Phase 2 TypeScript contracts

- **Scope:** Extend `src/contracts/data_contracts.ts` with:
  - `PhantomThreadSpawnPayload`, `PhantomThreadStateStream`
  - `ScopeGradeResult`
  - `ArchitectureGraphPayload`
  - `MatrixTelemetryEvent` discriminated union (exact string literals matching backend)
- **Acceptance Criteria:**
  - [x] Compiles with `bun` / `tsc`
  - [x] No drift from `base44/shared/contracts.ts` (same field names)
- **Completed:** 2026-07-22 · agent:cursor

### [x] FE-0.2 — Design tokens for Phase 2 states

- **Scope:** In `src/index.css` add tokens as needed:
  - Phantom pulse (soft bio glow, not purple)
  - Scope warning amber/crimson interrupt (use existing `--crimson` where possible; avoid new neon rainbow)
  - Blueprint edge/node colors (bio-dim / bio)
- **Acceptance Criteria:**
  - [x] Tokens documented in comment block
  - [x] No Inter/Roboto; keep `--font-mono`
  - [x] Still passes brand/void aesthetic of Phase 1
- **Completed:** 2026-07-22 · agent:cursor

### [x] FE-0.3 — View mode enum + shell switch

- **Scope:** Extend app shell so view modes include:
  - existing cortex / synthesis / resolution
  - `blueprint` (clears code feed for graph)
  - optional `scope_interrupt` overlay (non-route modal strip)
- **Acceptance Criteria:**
  - [x] Voice/UI can request blueprint without router pages
  - [x] Leaving blueprint restores prior feed state
- **Completed:** 2026-07-22 · agent:cursor

**Parent complete when:** all FE-0.* `[x]`

---

## Parent FE-1 · Phantom Threads UX

**Goal:** Hacker stays on frontend work while a corner bioluminescent indicator tracks background Phantom Threads; completion surfaces a 1-click merge affordance.  
**Depends on:** `FE-0`, backend `BE-1` (subscribe to `PhantomThreads` + merge-ready solutions).  
**Backend unlock:** `BE-1`.

### [ ] FE-1.1 — Voice / UI trigger copy for spawn

- **Scope:** When transcript matches phantom intent (or backend returns phantom assignment), show micro-ack in cortex (“Phantom Thread queued…”) then return focus to current UI work — do not force Synthesis full-screen for background jobs.
- **Acceptance Criteria:**
  - [ ] Sync blockers still use Synthesis Grid
  - [ ] Phantom path does not steal focal code feed
- **Completed:**

### [ ] FE-1.2 — `<PhantomPulse />` corner indicator

- **Scope:** New component — subtle pulsing bioluminescent dot/ring in a screen corner.
  - Subscribes to `PhantomThreads` for `owner` session
  - Maps `status`: `running`/`compiling` → pulse speed; `complete` → solid bio flash then idle; `failed` → crimson
- **Acceptance Criteria:**
  - [ ] Visible without reading logs
  - [ ] Click/focus opens minimal thread step list (not a dashboard card wall)
  - [ ] Unsubscribes on unmount
- **Completed:**

### [ ] FE-1.3 — Thread step micro-panel

- **Scope:** Peripheral panel listing `steps[]` labels + status; low information density; dismissible.
- **Acceptance Criteria:**
  - [ ] Updates live via subscription
  - [ ] Shows `git_branch` when present
- **Completed:**

### [ ] FE-1.4 — 1-click merge affordance on Resolution Feed

- **Scope:** When `GeneratedSolutions.merge_ready === true`, show text affordance `[ Merge phantom/<branch> ]` calling `execute-resolution` / `merge-phantom-branch` with `action_taken: 'merge'`.
- **Acceptance Criteria:**
  - [ ] No auto-merge
  - [ ] Success shows deployment/PR URL; failure shows bio-crimson `error_trace`
  - [ ] Discard/abandon path available
- **Completed:**

**Parent complete when:** all FE-1.* `[x]`

---

## Parent FE-2 · Scope-Sniper Interrupt UX

**Goal:** Ambient Cortex interrupts high-friction / off-MVP asks with remaining time + Base44 shortcut suggestion.  
**Depends on:** `FE-0`, backend `BE-2`.  
**Backend unlock:** `BE-2`.

### [ ] FE-2.1 — Subscribe / handle `SCOPE_WARNING`

- **Scope:** On scope grade warning payload, interrupt cortex with copy pattern:
  - “Warning: High-friction request detected. You have {N} hours remaining. Recommending: {shortcut}.”
- **Acceptance Criteria:**
  - [ ] Hours derived from `countdown_deadline` (client display ok if server sends `hours_remaining`)
  - [ ] Does not permanently block voice; offers `[ Use shortcut ]` / `[ Override — build anyway ]`
- **Completed:**

### [ ] FE-2.2 — MVP + deadline setup micro-flow

- **Scope:** First-run or voice-driven capture UI for `core_mvp_definition` + `countdown_deadline` (minimal text entry / confirm from transcript). Surface remaining time as quiet peripheral readout — not a hero countdown widget cluster.
- **Acceptance Criteria:**
  - [ ] Values persist via HackathonState update API/function
  - [ ] Empty MVP → Scope-Sniper stays dormant (no false warnings)
- **Completed:**

### [ ] FE-2.3 — Override & shortcut actions

- **Scope:** Wire buttons to continue synthesis with `scope_override` or accept shortcut suggestion (pre-fill next voice/context tag).
- **Acceptance Criteria:**
  - [ ] Override reaches backend
  - [ ] Shortcut path reduces to recommended Base44 pattern in next payload `context_tags`
- **Completed:**

**Parent complete when:** all FE-2.* `[x]`

---

## Parent FE-3 · Neural Blueprinting (WebGL Node Graph)

**Goal:** “Matrix, visualize the data flow” clears the code feed and renders a minimalist interactive graph of Deno functions ↔ PostgreSQL RLS tables.  
**Depends on:** `FE-0.3`, backend `BE-3`.  
**Backend unlock:** `BE-3`.

### [ ] FE-3.1 — Blueprint view activation

- **Scope:** On voice/backend signal (or command palette text), switch shell to `blueprint`; hide Resolution code feed; show graph canvas full-bleed in the void.
- **Acceptance Criteria:**
  - [ ] Exit via voice (“show code feed”) or `[ Esc ]` / text affordance
  - [ ] No card chrome; nodes are geometric points/lines only
- **Completed:**

### [ ] FE-3.2 — `<NeuralBlueprintCanvas />` (lightweight WebGL / Canvas)

- **Scope:** Render `ArchitectureGraphPayload` nodes + edges.
  - Prefer lightweight WebGL (e.g. regl / raw WebGL / thin lib) — avoid heavy dashboard graph suites unless already in repo
  - Pan/zoom lightly; click node → peripheral detail (label, kind, related edges)
- **Acceptance Criteria:**
  - [ ] Handles empty / partial graphs
  - [ ] 60fps target on typical laptop for ≤ ~200 nodes
  - [ ] Subscribes to `ArchitectureGraph` for live refresh
- **Completed:**

### [ ] FE-3.3 — Trace mode for bug hunting

- **Scope:** Selecting a Deno function node highlights transitive edges to entities / RLS policies (visual “trace”) to replace log-reading for data-flow bugs.
- **Acceptance Criteria:**
  - [ ] Highlight uses bio glow; non-path dims
  - [ ] Works offline on last snapshot if refresh fails
- **Completed:**

### [ ] FE-3.4 — Trigger rebuild from UI

- **Scope:** Text affordance `[ Refresh neural map ]` invokes `build-architecture-graph`.
- **Acceptance Criteria:**
  - [ ] Shows quiet synthesizing state without leaving blueprint
  - [ ] Errors surface as crimson micro-text + `MATRIX_DENIED` audio if wired
- **Completed:**

**Parent complete when:** all FE-3.* `[x]`

---

## Parent FE-4 · Tactile Telemetry (Web Audio)

**Goal:** Map WebSocket / subscription event types to preloaded Web Audio buffers so the hacker hears deploy/eval/phantom state without reading terminals.  
**Depends on:** `FE-0.1`, backend `BE-4` event names.  
**Backend unlock:** `BE-4`.

### [ ] FE-4.1 — `<TactileTelemetry />` audio engine

- **Scope:** Module that:
  - Preloads small AudioBuffers (synth hum, mechanical click, dissonant chirp)
  - Exposes `play(eventType: MatrixTelemetryEvent['type'])`
  - Respects user mute + `prefers-reduced-motion` / reduced-sound preference
- **Acceptance Criteria:**
  - [ ] No autoplay violation: unlock AudioContext on first user gesture (auth or mic allow)
  - [ ] Buffers local assets under e.g. `src/audio/`
- **Completed:**

### [ ] FE-4.2 — Event → sound map

- **Scope:** Wire map (initial):

  | Event | Sound |
  |-------|--------|
  | `PHANTOM_RUNNING` / `PHANTOM_COMPILING` | low rhythmic synth hum (loop while compiling) |
  | `EVALS_PASSED` / `SYNTHESIS_COMPLETE` | sharp mechanical click |
  | `EVALS_FAILED` / `MATRIX_DENIED` | dissonant electronic chirp |
  | `SCOPE_WARNING` | soft dual-tone attention (short) |
  | `BRANCH_READY` | soft bio chime |

- **Acceptance Criteria:**
  - [ ] Driven only by typed event strings — not free-text log scraping
  - [ ] Hum stops on complete/fail
- **Completed:**

### [ ] FE-4.3 — Subscription bridge

- **Scope:** From existing entity subscriptions (`ActiveBlockers`, `PhantomThreads`, `GeneratedSolutions`), read `telemetry_event` (or dedicated events) and call `play()`.
- **Acceptance Criteria:**
  - [ ] No double-fires on duplicate subscription events
  - [ ] Mute toggle as text affordance `[ Audio: on|off ]` peripheral
- **Completed:**

**Parent complete when:** all FE-4.* `[x]`

---

## Parent FE-5 · Integration Polish, A11y & Docs

**Goal:** Phase 2 FE is shippable beside Phase 1 without cognitive overload.  
**Depends on:** FE-1…FE-4 substantially complete.

### [ ] FE-5.1 — Information density pass

- **Scope:** Ensure first viewport still: brand/cortex focal + one context + CTAs; Phantom/Scope/Audio are peripheral. Blueprint is the only mode that clears the feed.
- **Acceptance Criteria:**
  - [ ] No stat strips / pill clusters / multi-card dashboards added
  - [ ] UI plan section updated in `agents/ui/ui-plan-velocity-matrix.md` for Phase 2 views
- **Completed:**

### [ ] FE-5.2 — Keyboard + reduced sensory modes

- **Scope:** Esc exits blueprint; mute audio; respect reduced motion (CSS + no pulse loops).
- **Acceptance Criteria:**
  - [ ] Usable without sound
  - [ ] Focus states visible on text affordances
- **Completed:**

### [ ] FE-5.3 — FE smoke checklist

- **Scope:** Manual/scripted checklist: phantom pulse, scope interrupt, blueprint render, audio map, merge click.
- **Acceptance Criteria:**
  - [ ] Checklist checked into `agents/plans/phase2/` or evals notes
  - [ ] Blockers filed for any BE gaps found
- **Completed:**

**Parent complete when:** all FE-5.* `[x]`

---

## Frontend Definition of Done (Phase 2.0)

- [ ] All parents FE-0…FE-5 marked `[x]`
- [ ] Phantom work never hijacks the primary code feed
- [ ] Scope warnings show remaining hours + shortcut / override
- [ ] Blueprint mode visualizes function ↔ RLS/entity edges
- [ ] Audio maps 1:1 to `MatrixTelemetryEvent` types
- [ ] Contracts match backend; no silent field renames

---

## Cross-Plan Dependency Map

| FE task | Blocked on BE |
|---------|----------------|
| FE-0.1 | BE-0.5 (parallel OK if identical stubs) |
| FE-1.* | BE-1.* |
| FE-2.* | BE-2.* |
| FE-3.* | BE-3.* |
| FE-4.* | BE-4.* |
| FE-5.* | FE-1…4 + corresponding BE parents |

| Pillar | FE parents | Primary UI artifacts |
|--------|------------|----------------------|
| Phantom Threads | FE-0, FE-1, FE-4 | `<PhantomPulse />`, merge affordance |
| Scope-Sniper | FE-0, FE-2 | Cortex interrupt strip |
| Neural Blueprinting | FE-0, FE-3 | `<NeuralBlueprintCanvas />` |
| Tactile Telemetry | FE-0, FE-4 | `<TactileTelemetry />` + `src/audio/*` |
