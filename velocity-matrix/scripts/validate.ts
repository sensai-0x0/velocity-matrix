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
  "src/api/base44Client.ts",
  "src/api/matrixApi.ts",
  "src/lib/matrixMappers.ts",
]) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(rel);
}

console.log("\n>> [VALIDATE] Frontend ↔ backend contract parity");
const uiContracts = readFileSync(
  join(ROOT, "src/contracts/data_contracts.ts"),
  "utf8",
);
const beContracts = readFileSync(
  join(ROOT, "base44/shared/contracts.ts"),
  "utf8",
);
for (const name of [
  "VoiceIngestionPayload",
  "VoiceIngestionResponse",
  "SynthesisStateStream",
  "ResolutionArtifact",
  "ExecutionPayload",
  "ExecutionResult",
  "ProvisionHackathonStatePayload",
  "ProvisionHackathonStateResult",
]) {
  const uiHas = uiContracts.includes(`export interface ${name}`);
  const beHas = beContracts.includes(`export interface ${name}`);
  if (!uiHas || !beHas) {
    fail(`interface ${name} missing in ${!uiHas ? "UI" : "backend"} contracts`);
  } else {
    ok(`interface ${name}`);
  }
}
if (!uiContracts.includes("hacker_id?:") || !beContracts.includes("hacker_id?:")) {
  fail("VoiceIngestionPayload.hacker_id must be optional (Node 01 uses JWT owner_id)");
} else {
  ok("hacker_id optional on both contract modules");
}
for (const token of [
  "blocker_id",
  "completion_percentage",
  "artifact_id",
  "available_actions",
  "target_connector",
  "deployment_url",
]) {
  if (!uiContracts.includes(token) || !beContracts.includes(token)) {
    fail(`token ${token} missing from dual contracts`);
  } else {
    ok(`token ${token}`);
  }
}

console.log("\n>> [VALIDATE] Entity → UI mapper + typed invokes");
const mapperSrc = readFileSync(join(ROOT, "src/lib/matrixMappers.ts"), "utf8");
for (const bridge of [
  "toSynthesisStream",
  "toResolutionArtifact",
  "blocker_id",
  "artifact_id",
  "blocker_reference",
  "payload",
]) {
  if (!mapperSrc.includes(bridge)) fail(`matrixMappers missing ${bridge}`);
  else ok(`mapper ${bridge}`);
}
const apiSrc = readFileSync(join(ROOT, "src/api/matrixApi.ts"), "utf8");
for (const invoke of [
  "process-voice-command",
  "execute-resolution",
  "buildVoiceIngestionPayload",
  "provisionHackathonState",
]) {
  if (!apiSrc.includes(invoke)) fail(`matrixApi missing ${invoke}`);
  else ok(`matrixApi ${invoke}`);
}

console.log("\n>> [VALIDATE] Deno function entrypoints");
const fnDir = join(ROOT, "base44/functions");
const expectedFns = [
  "provision-hackathon-state",
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

console.log("\n>> [VALIDATE] B1 ActiveBlockers → synthesize-solution automation");
const synthFnConfig = join(fnDir, "synthesize-solution", "function.jsonc");
try {
  const cfg = parseJsonc(synthFnConfig) as {
    automations?: Array<{
      type?: string;
      entity_name?: string;
      event_types?: string[];
      is_active?: boolean;
    }>;
  };
  const entityHook = cfg.automations?.find(
    (a) =>
      a.type === "entity" &&
      a.entity_name === "ActiveBlockers" &&
      Array.isArray(a.event_types) &&
      a.event_types.includes("create"),
  );
  if (!entityHook) {
    fail(
      "synthesize-solution/function.jsonc missing ActiveBlockers create automation",
    );
  } else if (entityHook.is_active === false) {
    fail("on_active_blocker_create automation is inactive");
  } else {
    ok("ActiveBlockers create → synthesize-solution");
  }
} catch (e) {
  fail(`synthesize-solution/function.jsonc: ${(e as Error).message}`);
}

const ingestSrc = readFileSync(
  join(fnDir, "process-voice-command", "entry.ts"),
  "utf8",
);
if (!ingestSrc.includes('invoke("synthesize-solution"')) {
  fail("process-voice-command missing dual-path synthesize-solution invoke");
} else {
  ok("process-voice-command dual-path invoke");
}

console.log("\n>> [VALIDATE] B2 HackathonState provision");
const provisionSrc = readFileSync(
  join(fnDir, "provision-hackathon-state", "entry.ts"),
  "utf8",
);
if (
  !provisionSrc.includes("HackathonState.create") ||
  !provisionSrc.includes("owner_id: user.id") ||
  provisionSrc.includes("owner_id: opts") ||
  provisionSrc.includes("owner_id: body")
) {
  fail("provision-hackathon-state must create with JWT owner_id only");
} else {
  ok("provision-hackathon-state JWT owner_id");
}
const ensureSrc = readFileSync(
  join(ROOT, "src/lib/ensureHackathonState.ts"),
  "utf8",
);
if (!ensureSrc.includes("provision-hackathon-state")) {
  fail("ensureHackathonState must invoke provision-hackathon-state");
} else {
  ok("ensureHackathonState Edge provision");
}

console.log("\n>> [VALIDATE] Frontend F0 tokens");
const css = readFileSync(join(ROOT, "src/index.css"), "utf8");
for (const token of ["--crimson:", "--crimson-dim:"]) {
  if (!css.includes(token)) fail(`src/index.css missing ${token}`);
  else ok(`index.css ${token.replace(":", "")}`);
}

console.log("\n>> [VALIDATE] Frontend F1 auth gate");
for (const rel of [
  "src/hooks/useAuthSession.ts",
  "src/components/LockedCortex.tsx",
  "src/config/loginMethods.ts",
  "src/lib/ensureHackathonState.ts",
]) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(rel);
}
const appSrc = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
if (!appSrc.includes("useAuthSession") || !appSrc.includes("LockedCortex")) {
  fail("App.tsx missing F1 auth gate wiring");
} else {
  ok("App.tsx Locked Cortex gate");
}

console.log("\n>> [VALIDATE] Frontend F2 view machine");
for (const rel of [
  "src/cortex/cortexMachine.ts",
  "src/hooks/useCortexView.ts",
  "src/components/CortexMockControls.tsx",
]) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(rel);
}
if (!appSrc.includes("useCortexView") || !appSrc.includes("data-cortex={view}")) {
  fail("App.tsx missing F2 view-state wiring");
} else {
  ok("App.tsx Cortex view machine");
}

console.log("\n>> [VALIDATE] Frontend F3 subscriptions");
for (const rel of [
  "src/hooks/useMatrixSubscriptions.ts",
  "src/lib/matrixMappers.ts",
  "src/components/MatrixDisconnectToast.tsx",
]) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(rel);
}
if (
  !appSrc.includes("useMatrixSubscriptions") ||
  !appSrc.includes("MatrixDisconnectToast")
) {
  fail("App.tsx missing F3 subscription wiring");
} else {
  ok("App.tsx matrix subscriptions");
}

console.log("\n>> [VALIDATE] Frontend F4 voice ingest");
for (const rel of [
  "src/hooks/useVoiceIngest.ts",
  "src/components/AmbientVoicePanel.tsx",
  "src/api/matrixApi.ts",
  "src/lib/speechRecognition.ts",
]) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(rel);
}
if (
  !appSrc.includes("useVoiceIngest") ||
  !appSrc.includes("AmbientVoicePanel")
) {
  fail("App.tsx missing F4 voice ingest wiring");
} else {
  ok("App.tsx Ambient voice ingest");
}
if (!css.includes('data-urgency="true"') && !css.includes("[data-urgency=")) {
  fail("src/index.css missing urgency wave styles");
} else {
  ok("index.css urgency wave");
}

console.log("\n>> [VALIDATE] Frontend F5/F6 synthesis + resolution");
for (const rel of [
  "src/hooks/useResolutionActions.ts",
  "src/components/SynthesisSpinner.tsx",
  "src/components/NeuralNode.tsx",
]) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(rel);
}
const spinnerSrc = readFileSync(
  join(ROOT, "src/components/SynthesisSpinner.tsx"),
  "utf8",
);
if (!spinnerSrc.includes("degraded") || !spinnerSrc.includes("failed")) {
  fail("SynthesisSpinner missing degraded/failed props");
} else {
  ok("SynthesisSpinner degraded/failed");
}
const nodeSrc = readFileSync(
  join(ROOT, "src/components/NeuralNode.tsx"),
  "utf8",
);
if (!nodeSrc.includes("onAction") || !nodeSrc.includes("TYPE_MS")) {
  fail("NeuralNode missing type-reveal / onAction");
} else {
  ok("NeuralNode type-reveal + actions");
}
if (
  !appSrc.includes("useResolutionActions") ||
  !appSrc.includes("isDegradedBlocker") ||
  !appSrc.includes("isFailedBlocker")
) {
  fail("App.tsx missing F5/F6 resolution wiring");
} else {
  ok("App.tsx F5/F6 resolution feed");
}
if (!css.includes("data-failed") || !css.includes("neural-node-editor")) {
  fail("src/index.css missing failed spinner / editor styles");
} else {
  ok("index.css F5/F6 styles");
}

console.log("\n>> [VALIDATE] Frontend F7 voice authority + history");
for (const rel of [
  "src/lib/voiceAuthority.ts",
  "src/components/MatrixHistoryPanel.tsx",
]) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(rel);
}
const voiceAuth = readFileSync(join(ROOT, "src/lib/voiceAuthority.ts"), "utf8");
const voiceHook = readFileSync(join(ROOT, "src/hooks/useVoiceIngest.ts"), "utf8");
if (!voiceAuth.includes("matchVoiceAuthority") || !voiceAuth.includes("CANCEL")) {
  fail("voiceAuthority.ts missing phrase matchers");
} else {
  ok("voiceAuthority phrase matchers");
}
if (
  !voiceHook.includes("allowIngest") ||
  !voiceHook.includes('from "@/lib/voiceAuthority"')
) {
  fail("useVoiceIngest missing F7 allowIngest / voiceAuthority");
} else {
  ok("useVoiceIngest F7 authority mode");
}
if (
  !appSrc.includes("MatrixHistoryPanel") ||
  !appSrc.includes("allowIngest") ||
  !appSrc.includes('view !== "locked"')
) {
  fail("App.tsx missing F7 continuous authority / history wiring");
} else {
  ok("App.tsx F7 voice authority + history");
}
if (
  !css.includes("cortex-authority-hint") ||
  !css.includes("history-columns") ||
  !css.includes("@media (max-width: 640px)")
) {
  fail("src/index.css missing F7 history / mobile styles");
} else {
  ok("index.css F7 styles");
}
const ambient = readFileSync(join(ROOT, "src/components/AmbientVoicePanel.tsx"), "utf8");
if (!ambient.includes("INGESTING_AUDIO") || !ambient.includes("ambient-empty")) {
  fail("AmbientVoicePanel missing empty cortex idle copy");
} else {
  ok("AmbientVoicePanel empty cortex");
}

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
  "VITE_BASE44_APP_ID",
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
