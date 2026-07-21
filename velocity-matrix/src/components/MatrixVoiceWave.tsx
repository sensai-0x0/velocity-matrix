/**
 * Ambient Cortex listening waveform — reacts to VoiceSession updates.
 */
export function MatrixVoiceWave({
  active = false,
  amplitude = 0.4,
}: {
  active?: boolean;
  amplitude?: number;
}) {
  return (
    <div
      className="matrix-voice-wave"
      data-active={active}
      style={{ ["--amplitude" as string]: amplitude }}
      aria-label={active ? "Cortex listening" : "Cortex idle"}
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
