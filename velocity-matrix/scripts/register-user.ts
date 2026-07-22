/**
 * Register a Base44 email/password user.
 *
 * Security:
 * - Reads SEED_USER_EMAIL + SEED_USER_PASSWORD from env only (never argv logging).
 * - Password is sent to Base44 `/auth/register` (server-side hash) — not written to disk.
 * - Do not commit passwords; do not echo SEED_USER_PASSWORD.
 *
 * Usage:
 *   SEED_USER_EMAIL=you@example.com SEED_USER_PASSWORD='…' bun scripts/register-user.ts
 */
import { createClient } from "@base44/sdk";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Resolve app id from env or linked base44/.app.jsonc */
function resolveAppId(): string {
  const fromEnv =
    process.env.VITE_BASE44_APP_ID?.trim() ||
    process.env.BASE44_APP_ID?.trim() ||
    "";
  if (fromEnv && !fromEnv.startsWith("http")) return fromEnv;

  const appPath = join(ROOT, "base44/.app.jsonc");
  if (!existsSync(appPath)) {
    throw new Error("Missing BASE44_APP_ID / VITE_BASE44_APP_ID and base44/.app.jsonc");
  }
  const raw = readFileSync(appPath, "utf8").replace(/\/\/.*$/gm, "");
  const id = (JSON.parse(raw) as { id?: string }).id?.trim();
  if (!id) throw new Error("base44/.app.jsonc has no id");
  return id;
}

const email = process.env.SEED_USER_EMAIL?.trim();
const password = process.env.SEED_USER_PASSWORD;
if (!email || !password) {
  console.error(
    ">> [FATAL] Set SEED_USER_EMAIL and SEED_USER_PASSWORD in the environment (do not commit them).",
  );
  process.exit(1);
}

const appId = resolveAppId();
const base44 = createClient({ appId });

console.log(`>> Registering user ${email} on app ${appId}…`);

try {
  await base44.auth.register({ email, password });
  console.log(">> Registered. Verifying login (token held in-memory only)…");
  const login = await base44.auth.loginViaEmailPassword(email, password);
  const userId = login.user?.id ?? "(unknown)";
  console.log(`>> [OK] User ready · id=${userId} · email=${email}`);
  console.log(
    ">> Password is stored hashed by Base44 — not saved in this repo. Prefer rotating if it appeared in chat/logs.",
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  // Already registered is a success for idempotent seed
  if (/already|exists|registered/i.test(message)) {
    console.log(`>> User may already exist (${message}). Attempting login…`);
    try {
      const login = await base44.auth.loginViaEmailPassword(email, password);
      console.log(`>> [OK] Login works · id=${login.user?.id ?? "?"}`);
      process.exit(0);
    } catch (loginErr) {
      console.error(
        ">> [FATAL] Existing user but login failed:",
        loginErr instanceof Error ? loginErr.message : loginErr,
      );
      process.exit(1);
    }
  }
  console.error(">> [FATAL]", message);
  process.exit(1);
}
