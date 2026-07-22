/**
 * Ambient Cortex listening waveform — reacts to VoiceSession updates.
 */
export function MatrixVoiceWave({
  active = false,
  amplitude = 0.4,
  urgency = false,
}: {
  active?: boolean;
  amplitude?: number;
  /** Crimson spike when urgency_flag / urgent keywords detected */
  urgency?: boolean;
}) {
  return (
    <div
      className="matrix-voice-wave"
      data-active={active}
      data-urgency={urgency}
      style={{ ["--amplitude" as string]: amplitude }}
      aria-label={
        urgency
          ? "Cortex listening — urgent"
          : active
            ? "Cortex listening"
            : "Cortex idle"
      }
      role="status"
    >
      <span className="wave-bar" />
      <span className="wave-bar" />
      <span className="wave-bar" />
      <span className="wave-bar" />
      <span className="wave-bar" />
    </div>
  );
}
