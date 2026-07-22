/**
 * Corner toast for subscription drop / reconnect (ui-plan §7).
 */
interface MatrixDisconnectToastProps {
  message: string | null;
  onDismiss: () => void;
}

/** MATRIX_DISCONNECT affordance — auto-resubscribe is handled by the hook */
export function MatrixDisconnectToast({
  message,
  onDismiss,
}: MatrixDisconnectToastProps) {
  if (!message) return null;

  return (
    <div className="matrix-disconnect" role="status" aria-live="polite">
      <span>{message}</span>
      <button
        type="button"
        className="auth-affordance auth-affordance-inline"
        onClick={onDismiss}
      >
        [ Dismiss ]
      </button>
    </div>
  );
}
