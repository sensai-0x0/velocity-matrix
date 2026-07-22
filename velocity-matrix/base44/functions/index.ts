/**
 * Function index — Velocity Matrix synapses + auth provision.
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
    contract: "ActiveBlockers INSERT -> ResolutionArtifact",
    automation: "on_active_blocker_create (entity create)",
  },
  {
    name: "execute-resolution",
    node: "03_executor",
    path: "./execute-resolution/entry.ts",
    contract: "ExecutionPayload -> ExecutionResult",
  },
] as const;
