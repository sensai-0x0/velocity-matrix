/**
 * Function index — documents the three Velocity Matrix synapses.
 * Deployable entrypoints live in sibling directories.
 */
export const VELOCITY_MATRIX_FUNCTIONS = [
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
  },
  {
    name: "execute-resolution",
    node: "03_executor",
    path: "./execute-resolution/entry.ts",
    contract: "ExecutionPayload -> ExecutionResult",
  },
] as const;
