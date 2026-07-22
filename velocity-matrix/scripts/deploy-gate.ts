/**
 * B0 deploy prerequisites gate.
 * Checks env template keys, runs validate + evals, optionally deploys.
 *
 *   bun scripts/deploy-gate.ts           # check only
 *   bun scripts/deploy-gate.ts --deploy  # check then npx base44 deploy -y
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const wantDeploy = process.argv.includes("--deploy");

const REQUIRED_KEYS = [
  "BASE44_APP_ID",
  "VITE_BASE44_APP_ID",
  "GITHUB_PAT",
  "LLM_API_KEY",
  "SLACK_BOT_TOKEN",
  "SLACK_CHANNEL_ID",
] as const;

/** Parse KEY=VALUE lines from a dotenv file */
function parseEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    out[trimmed.slice(0, i)] = trimmed.slice(i + 1).trim();
  }
  return out;
}

console.log("\n>> [B0] Deploy prerequisites gate");

const examplePath = join(ROOT, ".env.example");
if (!existsSync(examplePath)) {
  console.error("  ✗ missing .env.example");
  process.exit(1);
}
console.log("  ✓ .env.example present");

const envPath = join(ROOT, ".env");
if (!existsSync(envPath)) {
  console.warn("  ! .env missing — copy from .env.example before live deploy");
} else {
  console.log("  ✓ .env present");
}

const env = existsSync(envPath)
  ? parseEnv(readFileSync(envPath, "utf8"))
  : {};
const exampleRaw = readFileSync(examplePath, "utf8");

for (const key of REQUIRED_KEYS) {
  if (!exampleRaw.includes(`${key}=`)) {
    console.error(`  ✗ .env.example missing ${key}`);
    process.exit(1);
  }
  console.log(`  ✓ .env.example ${key}`);
}

let emptySecrets = 0;
for (const key of REQUIRED_KEYS) {
  const val = env[key] ?? "";
  if (!val) {
    console.warn(`  ! ${key} empty in .env (required for live Deno / deploy)`);
    emptySecrets += 1;
  } else {
    console.log(`  ✓ ${key} set`);
  }
}

function run(cmd: string, args: string[]): number {
  console.log(`\n>> [B0] ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
  return r.status ?? 1;
}

if (run("bun", ["run", "validate"]) !== 0) process.exit(1);
if (run("bun", ["run", "evals:run"]) !== 0) process.exit(1);

console.log("\n>> [B0] Smoke checklist (manual after deploy):");
console.log("  1. Authenticate → provision-hackathon-state creates HackathonState");
console.log("  2. invoke process-voice-command → ActiveBlockers.owner_id === user.id");
console.log("  3. Automation / dual-path → synthesize-solution → GeneratedSolutions");

if (!wantDeploy) {
  if (emptySecrets > 0) {
    console.log(
      `\n>> [B0] Gate ready (code). Fill ${emptySecrets} empty secret(s) then: bun scripts/deploy-gate.ts --deploy`,
    );
  } else {
    console.log("\n>> [B0] Secrets present. Run with --deploy to push Base44 cloud.");
  }
  process.exit(0);
}

if (emptySecrets > 0 || !(env.BASE44_APP_ID && env.BASE44_ACCESS_TOKEN)) {
  console.error(
    "\n>> [FATAL] Refusing deploy — BASE44_APP_ID / BASE44_ACCESS_TOKEN (and connector secrets) required.",
  );
  process.exit(1);
}

process.exit(run("npx", ["base44", "deploy", "-y"]));
