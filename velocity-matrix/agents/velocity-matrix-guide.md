To deploy the "Velocity Matrix" autonomous co-founder within a high-stakes, 24-hour hackathon, an AI agent (like Claude Code or Cursor) requires a highly rigid set of instruction documents. These files act as the foundational blueprints for the Base44 infrastructure, defining the exact parameters of the grid.

Here is the detailed list of required documents, structured with exact instructions for an agent to immediately begin building:

1. `01_system_architecture.md` **(Core Flow & Event Triggers)**
  - **Purpose:** Maps the event-driven lifecycle of the AI consultant.
  - **Agent Instructions:** Define the exact execution sequence. Detail how the frontend voice-to-text integration fires and routes a secure POST request to the Base44 backend. Map out how this request invokes the primary Deno serverless function, queries current hackathon context from the database, pings the LLM API via Base44 connectors, and ultimately triggers the WebSocket broadcast. Include strict error handling and timeout fallbacks for rate limits to ensure the loop never crashes.
2. `02_entity_schemas.ts` **(Base44 Database Models)**
  - **Purpose:** Defines the strict TypeScript NoSQL structures that act as the AI's short-term and long-term memory.
  - **Agent Instructions:** Write the `export const ... = entity({})` definitions for the following data structures:
    - `HackathonState`: Tracks overall progress (`id`, `owner_id`, `current_focus_area`, `last_active_timestamp`).
    - `ActiveBlockers`: The problems the user is voicing aloud (`blocker_id`, `raw_transcript`, `parsed_issue`, `is_resolved`).
    - `GeneratedSolutions`: The code or infrastructure fixes the AI synthesizes (`solution_id`, `blocker_reference`, `typescript_code`, `has_been_committed`).
3. `03_deno_backend_functions.ts` **(The Autonomous Engine)**
  - **Purpose:** Houses the serverless runtime logic that processes the hacker's voice inputs and generates actionable code.
  - **Agent Instructions:** Scaffold the main asynchronous Deno loops. The code must import the Base44 SDK, ingest the transcript string, and format a precise system prompt injected with the current `HackathonState`. Write the execution logic to parse the LLM's structured JSON response and use Base44's create/update methods to write the solution back into the `GeneratedSolutions` entity without blocking the main event thread.
4. `04_realtime_ui_contract.md` **(Frontend Matrix Grid)**
  - **Purpose:** Dictates how the terminal UI consumes live data without manual polling.
  - **Agent Instructions:** Detail the frontend implementation of Base44's `entities.subscribe()` method. The documentation must specify that the UI should subscribe to changes on the `GeneratedSolutions` and `ActiveBlockers` entities. Instruct the agent on how to render a neon-green data stream that instantly flickers new solutions onto the DOM the exact millisecond the Deno backend function resolves.
5. `05_security_and_rls.ts` **(Row-Level Security Policies)**
  - **Purpose:** Ensures the hacker's proprietary code and state are locked down natively.
  - **Agent Instructions:** Write the Base44 authorization rules tying entity access to the user's OAuth session token. Define policies ensuring `read`, `write`, and `delete` operations on all active entities are strictly limited to the `owner_id` that initialized the hackathon workspace, preventing data leakage if the project is exposed to the public internet during deployment.
6. `06_connector_manifest.json` **(External Tool Integrations)**
  - **Purpose:** Maps the Base44 out-of-the-box integrations the AI needs to manipulate the outside world.
  - **Agent Instructions:** Provide the configuration schema required for the AI to authenticate and interact with third-party tools. Include API scopes and logic for the GitHub Connector (to automatically push boilerplate code), the Slack/Discord Connector (to ping the user when a massive deployment finishes), and the LLM API Connector to handle the complex reasoning queries. Ensure there are designated environments for secure token injection.

