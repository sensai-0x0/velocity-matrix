/**
 * Placeholder Neural Blueprint surface (FE-0.3) — full WebGL lands in FE-3.
 */
interface NeuralBlueprintStubProps {
  onExit: () => void;
}

/** Minimal blueprint shell — clears code feed without dashboard chrome */
export function NeuralBlueprintStub({ onExit }: NeuralBlueprintStubProps) {
  return (
    <div className="neural-blueprint-stub" role="region" aria-label="Neural blueprint">
      <p className="neural-blueprint-stub-title">{">> NEURAL_BLUEPRINT"}</p>
      <p className="neural-blueprint-stub-hint">
        Deno functions ↔ entities ↔ RLS — canvas mounts in FE-3
      </p>
      <button
        type="button"
        className="auth-affordance auth-affordance-inline"
        onClick={onExit}
      >
        [ Esc · Return to code feed ]
      </button>
    </div>
  );
}
