# 03_deno_backend_functions.ts

## Purpose
This document houses the serverless runtime logic that processes the hacker's voice inputs and generates actionable code. It outlines the asynchronous Deno edge functions that utilize the Base44 SDK to orchestrate context ingestion, LLM execution, and real-time state mutation.

## Agent Implementation Instructions

To the agent executing this blueprint, write the Deno function `base44/functions/process-voice-command/entry.ts` adhering strictly to the architectural constraints established in `01_system_architecture.md`.

### Deno & SDK Rules
- **Entry Point:** Use `Deno.serve(async (req) => { ... })` as the standard HTTP listener.
- **Client Initialization:** Import `createClientFromRequest` from `npm:@base44/sdk` to automatically inherit the hacker's active session and Row-Level Security (RLS) context. 
- **Resilience:** The endpoint must strictly return HTTP `200 OK` regardless of internal failures to prevent crashing the client-side Matrix loop.

## Code Artifact

```typescript
import { createClientFromRequest } from "npm:@base44/sdk";

export default Deno.serve(async (req) => {
  // 1. Initialize Base44 client securely from the request context
  const base44 = createClientFromRequest(req);

  let rawTranscript = "";

  try {
    const payload = await req.json();
    rawTranscript = payload.transcript;

    // 2. Ingest Hackathon Context (RLS ensures we only query the owner's data)
    const stateList = await base44.entities.HackathonState.list();
    const currentState = stateList[0]; 

    // 3. Construct Structured Prompt
    const systemPrompt = `
      You are the Velocity Matrix AI Consultant.
      Current Focus Area: ${currentState?.current_focus_area || "General Infrastructure"}
      Hacker's Audio Transcript: "${rawTranscript}"
      
      Analyze the transcript. Return a strict JSON object with:
      - 'parsed_issue': A clean, 1-sentence summary of the blocker.
      - 'typescript_code': The literal code snippet or terminal command to resolve it.
    `;

    // 4. Execute LLM with Timeout Guardrail
    // Utilizes native AI integrations rather than raw API fetches
    const llmCall = base44.integrations.Core.InvokeLLM({ prompt: systemPrompt });
    
    // 15-second timeout race condition to prevent hung execution loops
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("LLM_TIMEOUT")), 15000)
    );

    let llmResponse;
    try {
      llmResponse = await Promise.race([llmCall, timeout]);
    } catch (error) {
      if (error.message === "LLM_TIMEOUT") {
        // Degraded fallback as outlined in 01_system_architecture.md
        return new Response(JSON.stringify({ status: "degraded", message: "Timeout" }), { status: 200 });
      }
      throw error; // Pass to the main catch block for rate-limit or API failures
    }

    const { parsed_issue, typescript_code } = JSON.parse(llmResponse.text);

    // 5. State Mutation (Fires WebSocket Realtime Broadcast)
    const newBlocker = await base44.entities.ActiveBlockers.create({
      raw_transcript: rawTranscript,
      parsed_issue: parsed_issue,
      is_resolved: true
    });

    await base44.entities.GeneratedSolutions.create({
      blocker_reference: newBlocker.id,
      typescript_code: typescript_code,
      has_been_committed: false
    });

    // 6. Graceful Completion
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    // 7. Silent Failure Fallback (Logs to DB without crashing client)
    if (rawTranscript) {
      await base44.entities.ActiveBlockers.create({
        raw_transcript: rawTranscript,
        parsed_issue: `System Error: ${error.message}`,
        is_resolved: false // Leaves the grid node 'red'
      });
    }
    
    return new Response(JSON.stringify({ success: false, handled: true }), { status: 200 });
  }
});