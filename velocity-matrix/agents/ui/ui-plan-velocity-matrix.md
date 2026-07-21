# UI/UX Plan — Velocity Matrix

> **Status:** Authoritative frontend blueprint, reconciled against the backend architecture.
> **Backend source of truth:** `agents/01_system_architecture.md`, `agents/02_entity_schemas.md`,
> `agents/03_backend_logic.md`, `agents/04_ui_subscriptions.md`, `agents/05_security_and_rls.md`,
> `agents/auth_design.md`, `agents/data-contracts.md`, `AGENTS.md` (Node Grid).
> **Frontend implementation:** `src/App.tsx`, `src/components/*`, `src/contracts/data_contracts.ts`, `src/index.css`.

The UI is a thin, reactive skin over the Base44 event loop. Every visual state is **derived from a
database row or a WebSocket subscription event** — the frontend never invents state. The three views
below map 1:1 onto the three backend Node roles and the three core entities.

| View (UI) | Node (AGENTS.md) | Backend trigger | Entity / Contract | Subscription |
|-----------|------------------|-----------------|-------------------|--------------|
| Ambient Cortex | Node 01 · Ingestor | `functions.invoke('process-voice-command')` | `ActiveBlockers` / `VoiceIngestionPayload` | — (write) |
| Synthesis Grid | Node 02 · Synthesizer | Webhook `INSERT` on `ActiveBlockers` | `ActiveBlockers` (row updates) / `SynthesisStateStream` | `ActiveBlockers.subscribe()` |
| Resolution Feed | Node 03 · Executor | `functions.invoke('execute-resolution')` | `GeneratedSolutions` / `ResolutionArtifact` + `ExecutionPayload` | `GeneratedSolutions.subscribe()` |

---

## 1. Core Aesthetic: Neuropunk Minimalism

**The Infinite Canvas:** The background is an absolute void. No rigid borders, no structural boxes.
Elements float in dark space. **Design tokens are the shipped values in `src/index.css` — treat these
as canonical** (the earlier `#050505 / #10B981 / #E11D48` sketch is superseded):

| Token | Value | Role |
|-------|-------|------|
| `--void` | `#05070a` | Absolute background void |
| `--void-elevated` | `#0b1018` | Glass panel base |
| `--bio` | `#3dffc8` | Neon Emerald — resolved/active bioluminescence |
| `--bio-dim` | `#1a8f72` | Deep Phosphor — passive/idle data |
| `--bio-glow` | `rgba(61,255,200,0.25)` | Ambient glow halo |
| `--text` / `--text-muted` | `#d7f7ee` / `#6f9e91` | Primary / secondary type |
| **`--crimson`** *(add)* | `#E11D48` | **Bio-Crimson — unresolved blockers & error traces** |
| **`--crimson-dim`** *(add)* | `#7f1d2e` | Passive/failed-node borders |

> **Action item:** add `--crimson` / `--crimson-dim` to `src/index.css`. Backend explicitly renders a
> red "Failed Node" for `is_resolved: false` and error traces (see §7), so crimson is a required state color.

- **Typography as UI:** Monospaced type (`--font-mono`, IBM Plex Mono / SF Mono) carries the interface.
  Text is the primary UI element; standard buttons/containers are avoided in favor of text-string affordances.
- **Glassmorphism Panels:** Active code blocks sit on heavily blurred, translucent `--void-elevated`
  panels — depth without structural noise. Reserved for the Resolution Feed editing surface.

## 2. Spatial Layout & Low Information Density

- **Focal Point Dominance:** The screen center only ever shows the **Current Action Context** — which is
  simply "the most recent unresolved `ActiveBlocker` or newest `GeneratedSolution`."
- **Peripheral Hiding:** History (resolved blockers, prior solutions, `HackathonState.current_focus_area`,
  repo connections from the connector manifest) is hidden. It surfaces only via swipe gesture or the voice
  command `"Show matrix history"`.
- **Negative Space:** ~75% of the screen stays empty to lower cognitive load and let glowing components command attention.

---

## 3. Authentication Gate — The Locked Cortex (Solo-Cell Entry)

Grounded in `agents/auth_design.md`. Time-to-first-interaction target: **< 5 seconds.**

- **State 0 (Locked):** Ambient Cortex renders dimmed (`--bio-dim`), waveform frozen. A single
  minimalist text-string affordance: `[ Authenticate // GitHub ]`.
- **Handshake:** Click fires `base44.auth.signInWith('github')` → OAuth redirect → Base44 mints an
  HttpOnly-cookie JWT carrying `user.id`.
- **Auto-provision:** On first login, an Edge function seeds a `HackathonState` row for the `owner_id`.
  The cortex **unlocks** and transitions to the Ambient Cortex listening state.

> **Implementation note:** `base44/auth/config.jsonc` currently ships with `emailAndPassword: true` and
> all social providers `false`. To honor the Solo-Cell OAuth flow, enable `github` (and optionally
> `google`) once secrets are set in `.env`. Until then, the gate should render whichever `loginMethods`
> are enabled rather than hard-coding GitHub.

---

## 4. Dynamic Multi-View Architecture

The interface morphs around Base44 backend state across three reactive views. Views are **state
transitions of one surface**, not routed pages.

### View A · The Ambient Cortex (Listening State) — Node 01

- **Component:** `<MatrixVoiceWave active amplitude />` (`src/components/MatrixVoiceWave.tsx`).
- **Visual:** Near-black screen; a minimal geometric waveform pulses softly (`data-active="true"`
  drives the `pulse-wave` animation). `amplitude` is driven by live mic input level.
- **Interaction:** Web Speech API streams a transcript. On pause, the batched text bleeds onto the
  screen below the wave, then fades.
- **Backend link (write):** The fade triggers
  `base44.functions.invoke('process-voice-command', { transcript })`. The payload conforms to
  `VoiceIngestionPayload` (`agents/data-contracts.md`):
  `{ session_id, timestamp_ms, transcript, context_tags?, urgency_flag }`.
  - **`urgency_flag`** is set true when the transcript contains "urgent"/"blocker" → renders the wave
    spike in **crimson** to preview a high-priority node.
  - **Tenancy:** the client does **not** send `owner_id`; the backend forces `owner_id = user.id` from
    the JWT (see `auth_design.md` Rule A). UI must never trust or display a client-supplied owner id.

### View B · The Synthesis Grid (Processing State) — Node 02

- **Component:** `<SynthesisSpinner synthesizing label />` (`src/components/SynthesisSpinner.tsx`).
- **Trigger:** The `INSERT` on `ActiveBlockers` fires the Node 02 webhook; the UI enters this view the
  moment `process-voice-command` resolves `{ success: true }`.
- **Visual:** The waveform shatters into the geometric spinner. Information density collapses to a single
  telemetry line.
- **Live telemetry (`SynthesisStateStream` via `ActiveBlockers.subscribe()`):** the spinner's intensity,
  rotation speed, and label are driven by streamed row updates:
  | `status` stage | Label shown | Progress |
  |----------------|-------------|----------|
  | `parsing_intent` | `>> PARSING_INTENT...` | drives `completion_percentage` fill |
  | `querying_docs` | `>> SCANNING_CONNECTORS...` | " |
  | `generating_logic` | `>> SYNTHESIZING_ARCHITECTURE...` | " |
  | `verifying_syntax` | `>> VERIFYING_SYNTAX...` | " |
  - `completion_percentage` → visual fill of the spinner ring / progress arc.
  - `current_focus` → micro-text under the spinner.
  - `latency_ms` → small monospace counter pinned to a corner to emphasize speed.

> **Contract gap to close:** `SynthesisStateStream` (`data-contracts.md`) requires
> `status`, `completion_percentage`, `current_focus`, and `latency_ms` on the streamed row, but the
> deployed `ActiveBlockers` schema (`02_entity_schemas.md`) only has
> `owner_id, raw_transcript, parsed_issue, is_resolved`. **Add `status`, `completion_percentage`,
> `current_focus`, and `latency_ms` to `ActiveBlockers`** so Node 02 can stream real telemetry;
> otherwise the Synthesis Grid can only show an indeterminate spinner.

### View C · The Resolution Feed (Output State) — Node 03

- **Component:** `<NeuralNode title code latencyMs />` (`src/components/NeuralNode.tsx`).
- **Trigger:** Fired instantly by `base44.entities.GeneratedSolutions.subscribe()` when a new row lands
  (`agents/04_ui_subscriptions.md`).
- **Visual:** A `<NeuralNode>` materializes center-screen; code types itself character-by-character in
  `--bio` emerald (matrix "neural injection" effect). The block sits on a glass panel.
- **Data (`ResolutionArtifact`):** rendered from
  `{ artifact_id, blocker_id, solution_type, payload: { language, code, file_path? }, neural_summary, available_actions }`.
  - `neural_summary` → single line of context above the code.
  - `payload.language` + `payload.code` → syntax-highlighted block. `payload.file_path` → target label.
  - `solution_type` selects the render mode: `code_snippet` (default), `terminal_command` (prompt style),
    `architecture_diagram` (rendered as diagram, not a code block).
- **Actions (text-buttons, driven by `available_actions`):** `[ Deploy ]`, `[ Override ]`, `[ Discard ]`.
  Hovering the node **pauses the type-stream**, letting the hacker edit the TypeScript inline in the glass panel.

> **Contract gap to close:** The deployed `GeneratedSolutions` schema only has
> `owner_id, blocker_reference, typescript_code, has_been_committed`. The UI needs
> `neural_summary`, `solution_type`, `language`, `file_path`, and `available_actions` to render the
> `ResolutionArtifact` faithfully. Either extend the entity or have Node 02 pack these into the
> artifact payload. `has_been_committed` maps to a small "committed ✓" badge on the node.

---

## 5. Hacker Authority — Execution & Override

When the hacker acts on a `<NeuralNode>`, the UI fires `execute-resolution` with an `ExecutionPayload`
(`agents/data-contracts.md`):

```ts
base44.functions.invoke('execute-resolution', {
  artifact_id,
  action_taken: 'deploy' | 'override' | 'discard',
  modified_code,          // only when the user edited the glass panel
  target_connector: 'github_auto_commit' | 'cli_executor',
  commit_message,         // auto-generated unless the user overrides
});
```

- **`[ Deploy ]`** → `action_taken: 'deploy'`, routes to `github_auto_commit` (or `cli_executor`).
- **`[ Override ]`** → `action_taken: 'override'` with the edited `modified_code` diff from the panel.
- **`[ Discard ]`** → `action_taken: 'discard'`; node dissolves, no connector call.
- **Result (`ExecutionResult`):** on `success`, show `deployment_url` and flip the node's committed badge
  (`has_been_committed`); on failure, render `error_trace` in **Bio-Crimson** (§7). A resolved commit
  also pings the hacker via the `slack_notifier` connector for long background deploys.
- **Execution is gated:** per `AGENTS.md` Node 03, no connector fires until an explicit
  `[ Deploy ]`/`[ Override ]` payload is received from the authenticated hacker.

---

## 6. Voice-First Authority & Text Override

- Voice is the ultimate interrupt. `"Cancel that"` instantly shatters the Synthesis Grid or Resolution
  Feed and snaps back to the Ambient Cortex — the UI stops rendering the in-flight row and unsubscribes
  from that artifact stream.
- `"Show matrix history"` reveals the peripheral history layer (resolved blockers + prior solutions).
- Keyboard input is reserved strictly for precision editing of generated code inside the glass panel.

---

## 7. Error, Degraded & Empty States (Resilience UX)

The backend **never crashes the loop** (`01_system_architecture.md` returns `200 OK` on all paths), so
the UI must visually represent every degraded path instead of erroring:

| Backend condition | Row signal | UI rendering |
|-------------------|-----------|--------------|
| LLM timeout (15s race) | `{ status: "degraded" }` / `JobStatus: degraded` | Spinner turns amber-dim, label `>> DEGRADED · RETRYING...`, UI polls for retry |
| Rate limit `429` | transcript re-queued into `ActiveBlockers` | Node shown as **crimson pending**, `>> QUEUED · LIMIT_COOLDOWN` |
| Silent failure | `ActiveBlockers { is_resolved: false, parsed_issue: "System Error: ..." }` | **Red "Failed Node"** (crimson border/glow) with the error text |
| Subscription drop | `onError` in `04_ui_subscriptions.md` | Corner toast `MATRIX_DISCONNECT · reconnecting...`, auto-resubscribe |
| Empty cortex | no rows | Idle waveform + muted prompt `>> INGESTING_AUDIO...` |

**State color semantics:** unresolved/failed/error = **crimson**; in-flight synthesis = **bio-dim →
bio** as `completion_percentage` climbs; resolved/committed = **bio** emerald.

---

## 8. Subscription & State-Binding Rules

Per `agents/04_ui_subscriptions.md` — **no raw WebSockets, no `setInterval` polling.**

- Subscribe to `ActiveBlockers` (`filter: { is_resolved: false }`) → drives Ambient Cortex red nodes +
  Synthesis Grid telemetry.
- Subscribe to `GeneratedSolutions` → drives Resolution Feed; prepend new rows to local state.
- Bind subscription payloads to React `useState`; on `created`/`updated`, upsert by `id` at the top of
  the array. Always return the `unsubscribe*()` cleanups on unmount to prevent leaks.
- All reads are RLS-scoped: the client only ever sees its own `owner_id` rows (`05_security_and_rls.ts`),
  so the UI needs **no client-side owner filtering** — trust the isolated stream.

---

## 9. Component ↔ Contract Map (Implementation Checklist)

| Component | File | Props today | Contract to wire | TODO |
|-----------|------|-------------|------------------|------|
| `MatrixVoiceWave` | `src/components/MatrixVoiceWave.tsx` | `active`, `amplitude` | `VoiceIngestionPayload` | drive `amplitude` from live mic; crimson spike on `urgency_flag` |
| `SynthesisSpinner` | `src/components/SynthesisSpinner.tsx` | `synthesizing`, `label` | `SynthesisStateStream` | add `progress`/`status`/`latencyMs` props; map stage→label |
| `NeuralNode` | `src/components/NeuralNode.tsx` | `title`, `code`, `latencyMs` | `ResolutionArtifact` | add `language`, `filePath`, `summary`, `actions`, type-reveal + edit mode |
| `App` shell | `src/App.tsx` | static demo | all three subscriptions | add auth gate, subscriptions, view-state machine |

> **Contract naming reconciliation:** three payload shapes currently coexist —
> `agents/data-contracts.md` (`VoiceIngestionPayload`, `SynthesisStateStream`, `ResolutionArtifact`,
> `ExecutionPayload`), the entity fields in `02_entity_schemas.md`, and the frontend's own
> `src/contracts/data_contracts.ts` (`VoiceIngestion`, `SynthesisArtifactPayload`,
> `ExecutionTracePayload`, `ResolutionFeedEvent`). **Adopt `agents/data-contracts.md` as canonical** and
> refactor `src/contracts/data_contracts.ts` to match, so the UI, WebSocket stream, and entities share
> one strict TypeScript contract. Also note `data-contracts.md` uses `hacker_id`/`session_id` while the
> backend forces `owner_id` — the UI should reference `owner_id` for tenancy and treat `session_id` as
> the per-session correlation key only.

---

## 10. View-State Machine (Summary)

```
[Locked Cortex] --auth ok--> [Ambient Cortex]
     ^                              |
     |                    voice pause / invoke('process-voice-command')
     |                              v
     |                        [Synthesis Grid] <-- ActiveBlockers.subscribe (status/percentage)
     |                              |
     |                 GeneratedSolutions.subscribe(created)
     |                              v
     |                        [Resolution Feed] --[Deploy|Override]--> invoke('execute-resolution')
     |                              |                                          |
     +------ "Cancel that" --------+                                    success/error
                                    |                                          v
                          "Show matrix history"                    [Committed ✓] / [Crimson error]
```

Every transition is driven by a backend event or an explicit hacker command — the UI holds no
authoritative state of its own.
