/**
 * `/reset-password` — complete Base44 reset with token from email deep-link.
 */
import { useState, type FormEvent } from "react";
import { base44 } from "@/api/base44Client";
import { navigateAuth } from "@/lib/authRoutes";

interface ResetPasswordPanelProps {
  /** Token from `/reset-password?token=…` (or reset_token / resetToken) */
  resetToken: string | null;
}

/** Set a new password after following the email reset link */
export function ResetPasswordPanel({ resetToken }: ResetPasswordPanelProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resetToken) {
      setError(">> MISSING_TOKEN · open the link from your reset email");
      return;
    }
    if (password.length < 8) {
      setError(">> WEAK_PASSWORD · use at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError(">> MISMATCH · passwords do not match");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await base44.auth.resetPassword({
        resetToken,
        newPassword: password,
      });
      setDone(true);
      setPassword("");
      setConfirm("");
      // Drop token from the URL after success (single-use)
      window.history.replaceState({}, "", "/reset-password");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!resetToken && !done) {
    return (
      <section className="locked-cortex" aria-label="Reset password">
        <p className="locked-cortex-prompt" role="status">
          {">> RESET_PASSWORD · token required"}
        </p>
        <p className="locked-cortex-error" role="alert">
          {
            ">> INVALID_LINK · request a new reset email from forgot-password"
          }
        </p>
        <button
          type="button"
          className="auth-affordance"
          onClick={() => navigateAuth("forgot-password")}
        >
          [ Request New Link ]
        </button>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          onClick={() => navigateAuth("login")}
        >
          [ Return // Login ]
        </button>
      </section>
    );
  }

  return (
    <section className="locked-cortex" aria-label="Reset password">
      <p className="locked-cortex-prompt" role="status">
        {">> RESET_PASSWORD · set a new credential"}
      </p>

      {done ? (
        <>
          <p className="locked-cortex-success" role="status">
            {">> PASSWORD_UPDATED · you can authenticate now"}
          </p>
          <button
            type="button"
            className="auth-affordance"
            onClick={() => navigateAuth("login")}
          >
            [ Return // Login ]
          </button>
        </>
      ) : (
        <form className="auth-email-form" onSubmit={onSubmit}>
          <label className="auth-field">
            <span>new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={busy}
            />
          </label>
          <label className="auth-field">
            <span>confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              disabled={busy}
            />
          </label>
          <button type="submit" className="auth-affordance" disabled={busy}>
            {busy ? "[ Updating… ]" : "[ Set New Password ]"}
          </button>
          <button
            type="button"
            className="auth-affordance auth-affordance-inline"
            onClick={() => navigateAuth("login")}
            disabled={busy}
          >
            [ Cancel ]
          </button>
        </form>
      )}

      {error && (
        <p className="locked-cortex-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
