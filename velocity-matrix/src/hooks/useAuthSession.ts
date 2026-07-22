/**
 * Session probe for the Locked Cortex → Ambient unlock (F1).
 */
import { useEffect, useState } from "react";
import type { User } from "@base44/sdk";
import { base44 } from "@/api/base44Client";
import { ensureHackathonState } from "@/lib/ensureHackathonState";

export type AuthStatus = "loading" | "locked" | "authenticated";

export interface AuthSession {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  /** Re-run me() after email login without full page reload */
  refresh: () => Promise<void>;
  logout: () => void;
}

/** Resolve current Base44 user; unlocks Ambient Cortex when authenticated */
export function useAuthSession(): AuthSession {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function probe() {
    setError(null);
    try {
      const authenticated = await base44.auth.isAuthenticated();
      if (!authenticated) {
        setUser(null);
        setStatus("locked");
        return;
      }

      const me = await base44.auth.me();
      if (!me?.id) {
        setUser(null);
        setStatus("locked");
        return;
      }

      try {
        await ensureHackathonState(me);
      } catch (provisionErr) {
        console.warn("[useAuthSession] HackathonState provision failed", provisionErr);
      }

      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Unauthenticated me() throws — treat as locked, not fatal UI crash
      setUser(null);
      setStatus("locked");
      if (!/401|403|unauthor|not authenticated|login/i.test(message)) {
        setError(message);
      }
    }
  }

  useEffect(() => {
    void probe();
  }, []);

  return {
    status,
    user,
    error,
    refresh: probe,
    logout: () => base44.auth.logout("/"),
  };
}
