/**
 * Singleton Base44 client for the Neuropunk UI (Doc 04 / F0).
 * Configure VITE_BASE44_APP_ID in `.env` (see `.env.example`).
 */
import { createClient } from "@base44/sdk";

const appId = import.meta.env.VITE_BASE44_APP_ID?.trim() ?? "";

if (!appId) {
  console.warn(
    "[base44Client] VITE_BASE44_APP_ID is unset — auth and entity calls will fail until configured.",
  );
}

/** Shared SDK client — session cookies / tokens managed by @base44/sdk auth module */
export const base44 = createClient({
  appId: appId || "velocity-matrix-unset",
});
