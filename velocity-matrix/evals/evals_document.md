In a highly autonomous, event-driven AI system like the Velocity Matrix, traditional unit tests aren't enough. Because you are relying on an LLM (Claude 3.5 Sonnet) to generate architecture and execute code dynamically, you need **AI Evals**—automated grading scripts that validate the agent's reasoning, payload adherence, and security boundaries before it ever touches production.

Here is the initialization list of core Evals, mapped directly to your Agent Nodes and Base44 architecture.

### 1. Ingestion Evals (Node 01: Ambient Cortex)

These tests ensure the voice-to-text pipeline is correctly interpreting the hacker's intent and structuring the database payload without dropping context.

* **Intent Classification Accuracy:** Feeds 50 pre-recorded hackathon prompts (e.g., "Set up a Stripe webhook", "Fix the CORS error") and verifies the agent assigns the correct `context_tags` and routes them to the right backend function 95%+ of the time.
* **Urgency Trigger Verification:** Tests if the `urgency_flag` boolean strictly fires on stress-indicator keywords ("blocker", "broken", "ASAP") without false positives on casual speech.
* **Context Continuity:** Validates that subsequent prompts (e.g., "Actually, make that webhook accept raw bodies") are correctly appended to the same `session_id` rather than spawning orphaned tasks.

### 2. Synthesis Evals (Node 02: Synthesis Grid)

This is the most critical evaluation phase. It grades the LLM's actual output against your strict TypeScript UI contracts.

* **Payload Schema Adherence:** Programmatically checks 100 LLM generations to ensure the output strictly matches the `ResolutionArtifact` TypeScript interface. A single missing field (like `neural_summary`) causes an instant fail.
* **AST Compilation Check:** Extracts the raw string from the `payload.code` block and runs it through a TypeScript Abstract Syntax Tree (AST) parser to ensure there are no syntax errors before it reaches the UI.
* **Hallucination Penalty:** Injects fake Base44 connector names into the prompt (e.g., "Use the AWS_S3 connector") and verifies that the LLM explicitly refuses and only utilizes the tools defined in the `06_connector_manifest.json`.

### 3. Execution & RLS Evals (Node 03 & Infrastructure)

These ensure the zero-trust environment holds up under pressure and latency targets are hit.

* **Zero-Trust Penetration Eval:** Programmatically attempts to execute a `read` or `update` on the `HackathonState` and `ActiveBlockers` tables using a mocked OAuth token where the `user.id` does *not* match the `owner_id`. Ensures the Base44 system throws the exact `MATRIX_DENIED` error.
* **Telemetry Latency Benchmark:** Measures the gap between the database Webhook firing and the first `SynthesisStateStream` websocket payload arriving. Must resolve in under 400ms to maintain the Neuropunk UI's illusion of instant responsiveness.
* **Connector Least-Privilege Check:** Verifies that the `github_auto_commit` connector cannot read repository secrets or modify branches outside of the designated hackathon scope.

---

> **The Setup:** These Evals should be automated using a lightweight runner (like Braintrust or LangSmith) integrated directly into your Base44 deploy script. If the `Synthesis Evals` fail, the deployment is aborted.