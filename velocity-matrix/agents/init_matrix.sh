#!/usr/bin/env bash
# Velocity Matrix bootstrap — scaffolds dirs, env template, runs validation.
# Does NOT live-deploy unless --deploy is passed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY=false
for arg in "$@"; do
  case "$arg" in
    --deploy) DEPLOY=true ;;
    -h|--help)
      echo "Usage: agents/init_matrix.sh [--deploy]"
      echo "  Scaffold + validate by default. Pass --deploy to run npx base44 deploy -y."
      exit 0
      ;;
  esac
done

echo ">> [SYSTEM] INITIALIZING VELOCITY MATRIX BOOTSTRAP..."

# ---------------------------------------------------------
# PHASE 1: Workspace Bootstrapping & Identity
# ---------------------------------------------------------
echo ">> [PHASE 1] Ensuring Base44 directories..."
mkdir -p \
  base44/auth \
  base44/entities \
  base44/functions/process-voice-command \
  base44/functions/synthesize-solution \
  base44/functions/execute-resolution \
  base44/functions/provision-hackathon-state \
  base44/connectors \
  base44/shared \
  src/contracts

# Auth blueprint → live config (real Base44 schema)
if [ -f agents/08_auth_config.jsonc ]; then
  cp agents/08_auth_config.jsonc base44/auth/config.jsonc
  echo ">> [PHASE 1] Synced auth config from agents/08_auth_config.jsonc"
fi

echo ">> [SYSTEM] Installing dependencies (bun preferred)..."
if command -v bun >/dev/null 2>&1; then
  bun install
else
  npm install
fi

# ---------------------------------------------------------
# PHASE 2–4: Artifacts are authored in base44/ (not copied
# from markdown blueprints). Verify critical files exist.
# ---------------------------------------------------------
echo ">> [PHASE 2–4] Verifying authored artifacts..."
REQUIRED=(
  "base44/config.jsonc"
  "base44/auth/config.jsonc"
  "base44/entities/hackathon-state.jsonc"
  "base44/entities/active-blockers.jsonc"
  "base44/entities/generated-solutions.jsonc"
  "base44/entities/schema.ts"
  "base44/entities/security.ts"
  "base44/connectors/manifest.json"
  "base44/shared/contracts.ts"
  "base44/functions/process-voice-command/entry.ts"
  "base44/functions/synthesize-solution/entry.ts"
  "base44/functions/execute-resolution/entry.ts"
  "base44/functions/provision-hackathon-state/entry.ts"
  "base44/shared/llm.ts"
  "base44/shared/ingest.ts"
  "src/contracts/data_contracts.ts"
)

MISSING=0
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo ">> [FATAL] Missing required artifact: $f"
    MISSING=1
  fi
done
if [ "$MISSING" -ne 0 ]; then
  exit 1
fi
echo ">> [SYSTEM] All required artifacts present."

# ---------------------------------------------------------
# Env template (connector secrets)
# ---------------------------------------------------------
if [ ! -f ".env" ]; then
  echo ">> [WARNING] .env missing — generating from .env.example"
  if [ -f ".env.example" ]; then
    cp .env.example .env
  else
    cat > .env <<'EOF'
BASE44_APP_ID=
BASE44_API_KEY=
BASE44_ACCESS_TOKEN=
BASE44_REFRESH_TOKEN=
GITHUB_PAT=
LLM_API_KEY=
SLACK_BOT_TOKEN=
SLACK_CHANNEL_ID=
EOF
  fi
fi

# Ensure connector keys exist even on older .env files
for key in GITHUB_PAT LLM_API_KEY SLACK_BOT_TOKEN SLACK_CHANNEL_ID VITE_BASE44_APP_ID; do
  if ! grep -q "^${key}=" .env 2>/dev/null; then
    echo "${key}=" >> .env
    echo ">> [SYSTEM] Appended missing ${key} to .env"
  fi
done

# ---------------------------------------------------------
# Validation gate + AI evals
# ---------------------------------------------------------
echo ">> [PHASE 5] Running validation gate..."
if command -v bun >/dev/null 2>&1; then
  bun run validate
  bun run evals:run
else
  npm run validate
  npm run evals:run
fi
echo ">> [EVALS] PASSED. RLS and payload contracts verified."

# ---------------------------------------------------------
# Optional live deploy (scaffold-only by default)
# ---------------------------------------------------------
if [ "$DEPLOY" = true ]; then
  echo ">> [SYSTEM] --deploy flag set. Pushing to Base44 Cloud..."
  npx base44 deploy -y
  echo ">> [SYSTEM] VELOCITY MATRIX ONLINE."
else
  echo ">> [SYSTEM] Scaffold complete. Skipping live deploy (pass --deploy to push)."
  echo ">> [SYSTEM] VELOCITY MATRIX READY FOR LOCAL VALIDATION."
fi
