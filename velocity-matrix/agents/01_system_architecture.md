# 01_system_architecture.md

## Purpose
This document maps the event-driven lifecycle of the "Velocity Matrix" AI consultant. It provides strict architectural instructions for the AI coding agent to implement the core loops utilizing the Base44 platform's SDK, Deno runtime, and built-in connectors.

## 1. Core Event Flow & Trigger Sequence

The architecture relies on an asynchronous, continuous event loop triggered by the solo hacker's voice. 

1. **Voice Input & Transcription (Frontend)**
   - The user interface maintains an active Web Speech API (or external transcription) stream.
   - When a pause is detected, the transcribed audio is batched into a `raw_transcript` string.
   - **Trigger:** The frontend SDK securely routes the request to the backend by calling `base44.functions.invoke('process-voice-command', { transcript: raw_transcript })`.

2. **Context Assembly (Backend Function)**
   - The Deno function (`base44/functions/process-voice-command/entry.ts`) receives the payload.
   - It instantiates the Base44 client using `createClientFromRequest(req)` to maintain the user's security session context.
   - It pulls the hacker's active workspace state via `await base44.entities.HackathonState.list()` and fetches unresolved issues from `base44.entities.ActiveBlockers`.

3. **LLM Synthesis via Connectors (Backend Function)**
   - The function constructs a strict system prompt containing the voice transcript, the retrieved context, and the project's codebase parameters.
   - It triggers the platform's native AI integration to avoid exposing raw API keys to the frontend: `await integrations.Core.InvokeLLM({ prompt: structured_prompt })`.

4. **State Mutation & Realtime Broadcast (Backend Function)**
   - The Deno backend parses the LLM's response into structured JSON (containing the code snippet, explanation, and action items).
   - It writes the solution directly into the database: `await base44.entities.GeneratedSolutions.create(parsed_payload)`.
   - **Realtime Trigger:** Base44 natively handles the WebSocket layer. The database write automatically fires an event to the frontend client listening via `base44.entities.GeneratedSolutions.subscribe()`, rendering the new code onto the Matrix grid instantly without manual polling.

---

## 2. Agent Implementation Instructions

To the agent executing this blueprint, strictly adhere to the following boundaries:

### SDK & Routing Rules
- **No Raw Fetches:** Never use raw `fetch()` calls to interact with the database or backend. Always use the `@base44/sdk` library.
- **No Hallucinated Endpoints:** AI models must be invoked exclusively via `integrations.Core.InvokeLLM()`.

### Execution Environment
- **Runtime:** Backend functions must be written in TypeScript targeting the Deno runtime. 
- **Permissions:** Operate using the authenticated user's context. Only elevate to `base44.asServiceRole` if performing an admin-level system action that explicitly requires bypassing Row-Level Security (RLS).

### Error Handling & Timeout Fallbacks
To ensure the 24-hour continuous loop never crashes during a hackathon, implement the following guardrails within the Deno function:

- **LLM Race Conditions:** Wrap the `InvokeLLM()` call in a `Promise.race()` with a 15-second timeout. If the LLM hangs, the function must return a `200 OK`, create a `JobStatus` record marked `"degraded"`, and let the frontend poll for a retry. 
- **Rate Limit Catching:** If the AI connector returns a `429 Too Many Requests`, intercept the error. Append the raw transcript into the `ActiveBlockers` database entity, resolve the HTTP request successfully, and trigger a background automation to process the queue once limits reset.
- **Silent Failures:** Do not throw unhandled exceptions to the client. All backend errors must be caught and gracefully saved to `ActiveBlockers` with `is_resolved: false`. This ensures the UI grid renders a red "Failed Node" to the hacker rather than breaking the application's event loop.