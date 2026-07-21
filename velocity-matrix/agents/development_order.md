To architect the Velocity Matrix effectively, the Base44 AI agent must execute the deployment of the configuration documents in a strict, dependency-driven sequence. In a serverless AI environment, misordering these steps results in catastrophic failures—such as backend functions attempting to invoke missing connectors or real-time subscriptions querying unsecured tables.

Here is the chronological deployment guide, engineered for the Base44 CLI, structuring the 9 architectural documents (plus the UX data contracts) into logical deployment phases.

## The Velocity Matrix Deployment Sequence

1. **Phase 1: Workspace Bootstrapping & Identity:** Environment & Root Config.
The foundational environment must be established before any AI logic or database tables are provisioned.

* **Document 09 (`package.json`):** Installs the `@base44/sdk` and defines the CLI deployment scripts. The environment does not exist without this.
* **Document 07 (`base44_config.jsonc`):** Maps the workspace directories. This tells the Base44 compiler exactly where to find the subsequent entities, functions, and manifests.
* **Document 08 (`auth_config.jsonc`):** Establishes the OAuth identity providers. Authentication *must* precede data modeling, as the database relies on user sessions to enforce security.


2. **Phase 2: The Ontological Grid & Access Control:** Data Layer & Security.
Once the Base44 environment is mapped, the database schemas are deployed, immediately followed by the security policies.

* **Document 02 (Entity Schemas):** Provisions the PostgreSQL tables (`HackathonState`, `ActiveBlockers`, `GeneratedSolutions`) in the Base44 cloud.
* **Document 05 (`05_security_and_rls.ts`):** Wraps the newly created schemas in Row-Level Security (RLS). Applying this immediately ensures zero-trust isolation is active before any backend functions are written, preventing accidental data leaks during testing.


3. **Phase 3: Exocortex Integration:** External Connectors.
The AI consultant needs its tools configured before the core logic can orchestrate them.

* **Document 06 (`06_connector_manifest.json`):** Registers the GitHub, Slack, and Claude 3.5 Sonnet integrations. This step injects the secure environment variables (`${env.*}`) into the Base44 workspace, priming the endpoints for the Deno runtimes.


4. **Phase 4: Autonomous Synapses:** Backend Business Logic.
With the database secured and tools connected, the brain of the Velocity Matrix is deployed.

* **Document 03 (Backend Logic):** Deploys the Deno serverless functions. These scripts are now safely able to import the schemas from Phase 2 and invoke the connectors from Phase 3 to process audio transcripts into functional code.


5. **Phase 5: Neuropunk Telemetry:** UI Binding & Real-Time Sync.
The backend is now fully operational. The final step bridges the Base44 cloud with the client-side UI.

* **Document 04 (UI Subscriptions):** Activates the WebSocket listeners on the Base44 backend, allowing the database to push row updates to the client in real-time without polling.
* **UX Data Contracts (TypeScript Interfaces):** The frontend implements the rigidly typed payloads (`VoiceIngestionPayload`, `SynthesisStateStream`, `ResolutionArtifact`) to ingest the backend data and drive the low-information-density visual components.


---

### Agent Execution Directive

Upon initialization, the automated agent should read this sequence, run `npm install` (Doc 09), validate the environment mappings (Doc 07), and then execute `npx base44 deploy`. The platform's dependency graph will utilize this exact order to securely compile the Velocity Matrix.