/**
 * MVP + deadline micro-setup for Scope-Sniper (FE-2.2).
 */
import { useState } from "react";
import { provisionHackathonState } from "@/api/matrixApi";

interface MvpDeadlineSetupProps {
  visible: boolean;
  onSaved?: () => void;
}

/** Quiet peripheral form — not a hero countdown widget */
export function MvpDeadlineSetup({ visible, onSaved }: MvpDeadlineSetupProps) {
  const [mvp, setMvp] = useState("");
  const [hours, setHours] = useState("14");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!visible) return null;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const h = Number(hours);
      const countdown_deadline =
        Number.isFinite(h) && h > 0 ? Date.now() + h * 3_600_000 : undefined;
      await provisionHackathonState({
        ...(mvp.trim() ? { core_mvp_definition: mvp.trim() } : {}),
        ...(countdown_deadline != null ? { countdown_deadline } : {}),
        scope_mode: "advisory",
      });
      setMsg(">> MVP / deadline synced");
      onSaved?.();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="mvp-setup" aria-label="MVP and deadline setup">
      <p className="mvp-setup-label">{"// SCOPE_SNIPER · MVP + DEADLINE"}</p>
      <label className="mvp-setup-field">
        <span>core_mvp_definition</span>
        <textarea
          value={mvp}
          onChange={(e) => setMvp(e.target.value)}
          rows={2}
          placeholder="e.g. Stripe webhook, Deno route, evals"
        />
      </label>
      <label className="mvp-setup-field">
        <span>hours remaining</span>
        <input
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          inputMode="decimal"
        />
      </label>
      <button
        type="button"
        className="auth-affordance auth-affordance-inline"
        disabled={busy}
        onClick={() => void save()}
      >
        {busy ? "[ Saving… ]" : "[ Sync HackathonState ]"}
      </button>
      {msg && <p className="mvp-setup-msg">{msg}</p>}
    </aside>
  );
}
