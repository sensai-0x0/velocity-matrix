import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Read linked Base44 app id from `.app.jsonc` when env is unset. */
function readLinkedAppId(): string {
  const appConfigPath = path.resolve(rootDir, "base44/.app.jsonc");
  try {
    const raw = fs.readFileSync(appConfigPath, "utf8");
    const stripped = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const parsed = JSON.parse(stripped) as { id?: string };
    return parsed.id?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Vite config for the Neuropunk UI — `@/` → `src/`. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const appId =
    env.VITE_BASE44_APP_ID?.trim() ||
    env.BASE44_APP_ID?.trim() ||
    readLinkedAppId();

  return {
    plugins: [react()],
    // SPA fallback so Base44 email deep-links (/forgot-password, /reset-password) resolve
    appType: "spa",
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
      },
    },
    // Bake app id so Base44 site builds work without a committed `.env`
    define: appId
      ? {
          "import.meta.env.VITE_BASE44_APP_ID": JSON.stringify(appId),
        }
      : {},
  };
});
