/**
 * Function index — Velocity Matrix synapses + Phase 2.0 Co-Founder Expansion.
 * Deployable entrypoints live in sibling directories.
 */
export const VELOCITY_MATRIX_FUNCTIONS = [
  {
    name: "provision-hackathon-state",
    node: "auth_provision",
    path: "./provision-hackathon-state/entry.ts",
    contract: "ProvisionHackathonStatePayload -> ProvisionHackathonStateResult",
  },
  {
    name: "process-voice-command",
    node: "01_ingestor",
    path: "./process-voice-command/entry.ts",
    contract: "VoiceIngestionPayload -> VoiceIngestionResponse",
  },
  {
    name: "synthesize-solution",
    node: "02_synthesizer",
    path: "./synthesize-solution/entry.ts",
    contract: "ActiveBlockers INSERT -> ResolutionArtifact | SCOPE_WARNING",
    automation: "on_active_blocker_create (entity create)",
  },
  {
    name: "execute-resolution",
    node: "03_executor",
    path: "./execute-resolution/entry.ts",
    contract: "ExecutionPayload -> ExecutionResult",
  },
  {
    name: "spawn-phantom-thread",
    node: "03_executor_phantom",
    path: "./spawn-phantom-thread/entry.ts",
    contract: "PhantomThreadSpawnPayload -> PhantomThread result",
  },
  {
    name: "build-architecture-graph",
    node: "blueprint",
    path: "./build-architecture-graph/entry.ts",
    contract: "{ session_id?, force_refresh? } -> ArchitectureGraphPayload",
  },
] as const;
