/**
 * Locked Cortex gate — text-string auth affordances for enabled login methods.
 */
import { useState, type FormEvent } from "react";
import { base44 } from "@/api/base44Client";
import {
  LOGIN_METHODS,
  PROVIDER_LABELS,
  enabledProviders,
  type AuthProviderId,
} from "@/config/loginMethods";
import { navigateAuth } from "@/lib/authRoutes";

interface LockedCortexProps {
  error?: string | null;
  /** Optional banner after a successful password reset */
  notice?: string | null;
  onAuthenticated: () => Promise<void>;
}

/** Minimal Solo-Cell entry — dimmed until JWT session exists */
export function LockedCortex({
  error,
  notice,
  onAuthenticated,
}: LockedCortexProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const providers = enabledProviders();
  const showEmail = LOGIN_METHODS.emailAndPassword;

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLocalError(null);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      await onAuthenticated();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleProvider(provider: AuthProviderId) {
    base44.auth.loginWithProvider(provider, window.location.pathname || "/");
  }

  const displayError = localError ?? error;

  return (
    <section className="locked-cortex" aria-label="Locked Cortex">
      <p className="locked-cortex-prompt" role="status">
        {">> CORTEX_LOCKED · authenticate to enter solo-cell"}
      </p>

      {notice && (
        <p className="locked-cortex-success" role="status">
          {notice}
        </p>
      )}

      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          className="auth-affordance"
          onClick={() => handleProvider(provider)}
          disabled={busy}
        >
          {`[ Authenticate // ${PROVIDER_LABELS[provider]} ]`}
        </button>
      ))}

      {showEmail && (
        <form className="auth-email-form" onSubmit={handleEmailLogin}>
          <button type="submit" className="auth-affordance" disabled={busy}>
            {busy ? "[ Authenticating… ]" : "[ Authenticate // Email ]"}
          </button>
          <label className="auth-field">
            <span>email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </label>
          <label className="auth-field">
            <span>password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </label>
          <button
            type="button"
            className="auth-affordance auth-affordance-inline"
            onClick={() => navigateAuth("forgot-password")}
            disabled={busy}
          >
            [ Reset Password ]
          </button>
        </form>
      )}

      {!showEmail && providers.length === 0 && (
        <p className="locked-cortex-empty">
          {">> NO_LOGIN_METHODS · enable email or OAuth in base44/auth/config.jsonc"}
        </p>
      )}

      {displayError && (
        <p className="locked-cortex-error" role="alert">
          {displayError}
        </p>
      )}
    </section>
  );
}
