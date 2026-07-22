/**
 * Peripheral Scope-Sniper interrupt strip (FE-2).
 */
import type { ScopeInterruptState } from "@/cortex/cortexMachine";

interface ScopeInterruptStripProps {
  interrupt: ScopeInterruptState;
  onDismiss: () => void;
  onOverride: () => void;
  onUseShortcut: () => void;
}

/** Low-density cortex interrupt — not a modal card wall */
export function ScopeInterruptStrip({
  interrupt,
  onDismiss,
  onOverride,
  onUseShortcut,
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
      <div className="scope-interrupt-actions">
        {interrupt.shortcutSuggestion && (
          <button
            type="button"
            className="auth-affordance auth-affordance-inline"
            onClick={onUseShortcut}
          >
            [ Use shortcut ]
          </button>
        )}
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          onClick={onOverride}
        >
          [ Override — build anyway ]
        </button>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          onClick={onDismiss}
        >
          [ Dismiss ]
        </button>
      </div>
    </aside>
  );
}
