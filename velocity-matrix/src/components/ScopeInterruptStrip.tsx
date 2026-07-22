/**
 * Peripheral Scope-Sniper interrupt strip (FE-0 / FE-2 shell).
 */
import type { ScopeInterruptState } from "@/cortex/cortexMachine";

interface ScopeInterruptStripProps {
  interrupt: ScopeInterruptState;
  onDismiss: () => void;
}

/** Low-density cortex interrupt — not a modal card wall */
export function ScopeInterruptStrip({
  interrupt,
  onDismiss,
}: ScopeInterruptStripProps) {
  const hours = Math.max(0, Math.round(interrupt.hoursRemaining * 10) / 10);
  return (
    <aside className="scope-interrupt" role="alert">
      <p className="scope-interrupt-copy">
        {`Warning: High-friction request detected. You have ${hours} hours remaining. ${interrupt.warningMessage}`}
        {interrupt.shortcutSuggestion
          ? ` Recommending: ${interrupt.shortcutSuggestion}`
          : ""}
      </p>
      <button
        type="button"
        className="auth-affordance auth-affordance-inline"
        onClick={onDismiss}
      >
        [ Dismiss ]
      </button>
    </aside>
  );
}
