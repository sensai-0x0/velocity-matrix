/**
 * Synthesis Grid visualizer — tracks Node 02 artifact compilation.
 */
export function SynthesisSpinner({
  synthesizing = false,
  label = "Synthesizing",
}: {
  synthesizing?: boolean;
  label?: string;
}) {
  return (
    <div
      className="synthesis-spinner"
      data-synthesizing={synthesizing}
      aria-busy={synthesizing}
      aria-label={label}
      role="status"
    >
      <div className="spinner-ring" />
      <span className="spinner-label">{synthesizing ? label : "Idle"}</span>
    </div>
  );
}
