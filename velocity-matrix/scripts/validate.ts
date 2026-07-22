/**
 * Validation gate: JSON/JSONC validity + schema↔contract field parity.
 * Run via: bun run validate
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;

function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  failures += 1;
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

/** Strip // and /* *\/ comments from JSONC, preserving strings */
function stripJsonc(raw: string): string {
  let out = "";
  let i = 0;
  let inString = false;
  let escaped = false;
  while (i < raw.length) {
    const c = raw[i]!;
    const next = raw[i + 1];

    if (inString) {
      out += c;
      if (escaped) {
        escaped = false;
      } else if (c === "\\") {
        escaped = true;
      } else if (c === '"') {
        inString = false;
      }
      i += 1;
      continue;
    }

    if (c === '"') {
      inString = true;
      out += c;
      i += 1;
      continue;
    }

    if (c === "/" && next === "/") {
      i += 2;
      while (i < raw.length && raw[i] !== "\n") i += 1;
      continue;
    }

    if (c === "/" && next === "*") {
      i += 2;
      while (i < raw.length && !(raw[i] === "*" && raw[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }

    out += c;
    i += 1;
  }
  return out;
}

function parseJsonc(path: string): unknown {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(stripJsonc(raw));
}

console.log("\n>> [VALIDATE] JSON / JSONC syntax");

const jsoncFiles = [
  "base44/config.jsonc",
  "base44/auth/config.jsonc",
  "base44/entities/hackathon-state.jsonc",
  "base44/entities/active-blockers.jsonc",
  "base44/entities/generated-solutions.jsonc",
];

for (const rel of jsoncFiles) {
  const path = join(ROOT, rel);
  try {
    parseJsonc(path);
    ok(rel);
  } catch (e) {
    fail(`${rel}: ${(e as Error).message}`);
  }
}

const manifestPath = join(ROOT, "base44/connectors/manifest.json");
try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    connectors?: Record<string, unknown>;
    $schema?: string;
  };
  if (manifest.$schema?.includes("](")) {
    fail("manifest.json $schema still contains markdown link syntax");
  } else {
    ok("base44/connectors/manifest.json");
  }
  const requiredConnectors = [
    "github_auto_commit",
    "slack_notifier",
    "llm_reasoning_core",
  ];
  for (const name of requiredConnectors) {
    if (!manifest.connectors?.[name]) {
      fail(`manifest missing connector: ${name}`);
    } else {
      ok(`connector: ${name}`);
    }
  }
} catch (e) {
  fail(`manifest.json: ${(e as Error).message}`);
}

console.log("\n>> [VALIDATE] Schema ↔ SynthesisStateStream / ResolutionArtifact parity");

const blockers = parseJsonc(
  join(ROOT, "base44/entities/active-blockers.jsonc"),
) as { properties?: Record<string, unknown>; rls?: unknown };
const solutions = parseJsonc(
  join(ROOT, "base44/entities/generated-solutions.jsonc"),
) as { properties?: Record<string, unknown>; rls?: unknown };
const hackathon = parseJsonc(
  join(ROOT, "base44/entities/hackathon-state.jsonc"),
) as { properties?: Record<string, unknown>; rls?: unknown };

const synthesisFields = [
  "status",
  "completion_percentage",
  "current_focus",
  "latency_ms",
];
for (const field of synthesisFields) {
  if (!blockers.properties?.[field]) {
    fail(`ActiveBlockers missing SynthesisStateStream field: ${field}`);
  } else {
    ok(`ActiveBlockers.${field}`);
  }
}

const resolutionFields = [
  "blocker_reference",
  "solution_type",
  "language",
  "code",
  "file_path",
  "neural_summary",
  "available_actions",
];
for (const field of resolutionFields) {
  if (!solutions.properties?.[field]) {
    fail(`GeneratedSolutions missing ResolutionArtifact field: ${field}`);
  } else {
    ok(`GeneratedSolutions.${field}`);
  }
}

if (!hackathon.properties?.target_repo_url) {
  fail("HackathonState missing target_repo_url (auth_design Rule C)");
} else {
  ok("HackathonState.target_repo_url");
}

console.log("\n>> [VALIDATE] RLS present on all entities");
for (const [name, entity] of [
  ["HackathonState", hackathon],
  ["ActiveBlockers", blockers],
  ["GeneratedSolutions", solutions],
] as const) {
  const rls = (entity as { rls?: Record<string, unknown> }).rls;
  if (!rls?.read || !rls?.create || !rls?.update || !rls?.delete) {
    fail(`${name} missing full RLS (create/read/update/delete)`);
  } else {
    ok(`${name} RLS`);
  }
}

console.log("\n>> [VALIDATE] Contract modules exist");
for (const rel of [
  "src/contracts/data_contracts.ts",
  "base44/shared/contracts.ts",
]) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(rel);
}

console.log("\n>> [VALIDATE] Deno function entrypoints");
const fnDir = join(ROOT, "base44/functions");
const expectedFns = [
  "process-voice-command",
  "synthesize-solution",
  "execute-resolution",
];
for (const name of expectedFns) {
  const entry = join(fnDir, name, "entry.ts");
  if (!existsSync(entry)) {
    fail(`missing function: ${name}/entry.ts`);
  } else {
    const src = readFileSync(entry, "utf8");
    if (!src.includes("Deno.serve")) {
      fail(`${name}/entry.ts missing Deno.serve`);
    } else if (!src.includes("createClientFromRequest")) {
      fail(`${name}/entry.ts missing createClientFromRequest`);
    } else {
      ok(`${name}/entry.ts`);
    }
  }
}

// Ensure no leftover markdown-as-config
console.log("\n>> [VALIDATE] No markdown contamination in config artifacts");
for (const rel of ["base44/config.jsonc", "base44/connectors/manifest.json"]) {
  const raw = readFileSync(join(ROOT, rel), "utf8");
  if (raw.includes("## Purpose") || raw.includes("```")) {
    fail(`${rel} still contains markdown documentation`);
  } else {
    ok(`${rel} is clean config`);
  }
}

// Env example keys
console.log("\n>> [VALIDATE] .env.example connector keys");
const envExample = readFileSync(join(ROOT, ".env.example"), "utf8");
for (const key of [
  "GITHUB_PAT",
  "LLM_API_KEY",
  "SLACK_BOT_TOKEN",
  "SLACK_CHANNEL_ID",
]) {
  if (!envExample.includes(`${key}=`)) fail(`.env.example missing ${key}`);
  else ok(`.env.example ${key}`);
}

if (envExample.includes("OPENAI_API_KEY")) {
  fail(".env.example still references OPENAI_API_KEY (use LLM_API_KEY)");
}

console.log("\n>> [VALIDATE] Entity jsonc files are kebab-case");
const entityFiles = readdirSync(join(ROOT, "base44/entities")).filter(
  (f: string) => f.endsWith(".jsonc"),
);
for (const f of entityFiles) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*\.jsonc$/.test(f)) {
    fail(`non-kebab entity file: ${f}`);
  } else {
    ok(f);
  }
}

if (failures > 0) {
  console.error(`\n>> [FATAL] ${failures} validation failure(s).\n`);
  process.exit(1);
}

console.log("\n>> [OK] All validation checks passed.\n");
