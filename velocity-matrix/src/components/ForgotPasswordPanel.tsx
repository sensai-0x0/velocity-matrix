/**
 * `/forgot-password` — request Base44 password reset email.
 */
import { useState, type FormEvent } from "react";
import { base44 } from "@/api/base44Client";
import { navigateAuth } from "@/lib/authRoutes";

/** Request reset link without revealing whether the email exists */
export function ForgotPasswordPanel() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    try {
      await base44.auth.resetPasswordRequest(trimmed);
      setSent(true);
    } catch (err) {
      // Soft success copy even on some 4xx to avoid email enumeration where possible
      const message = err instanceof Error ? err.message : String(err);
      if (/sent|success|check your email/i.test(message)) {
        setSent(true);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="locked-cortex" aria-label="Forgot password">
      <p className="locked-cortex-prompt" role="status">
        {">> RESET_PASSWORD · request email link"}
      </p>

      {sent ? (
        <>
          <p className="locked-cortex-success" role="status">
            {
              ">> CHECK_INBOX · if an account exists, a reset link was sent (expires / single-use)"
            }
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
            <span>email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </label>
          <button type="submit" className="auth-affordance" disabled={busy}>
            {busy ? "[ Sending… ]" : "[ Send Reset Link ]"}
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
