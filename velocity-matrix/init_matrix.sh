#!/usr/bin/env bash
# Executive bootstrap — syncs Zone 1 (agents/) into Zone 2 (base44/).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "▸ Velocity Matrix — init_matrix.sh"
echo "  Root: $ROOT"

mkdir -p \
  base44/auth \
  base44/connectors \
  base44/entities \
  base44/functions \
  src/components \
  src/contracts \
  evals

# Workspace routing
if [[ -f agents/07_base44_config.jsonc ]]; then
  cp agents/07_base44_config.jsonc base44/config.jsonc
  echo "  ✓ base44/config.jsonc ← agents/07_base44_config.jsonc"
fi

# OAuth identity
if [[ -f agents/08_auth_config.jsonc ]]; then
  cp agents/08_auth_config.jsonc base44/auth/config.jsonc
  echo "  ✓ base44/auth/config.jsonc ← agents/08_auth_config.jsonc"
fi

# Connectors (Phase 3)
if [[ -f agents/06_connector_manifest.json ]]; then
  cp agents/06_connector_manifest.json base44/connectors/manifest.json
  echo "  ✓ base44/connectors/manifest.json ← agents/06_connector_manifest.json"
fi

# Seed .env if missing
if [[ ! -f .env ]]; then
  cat > .env <<'EOF'
# Velocity Matrix secure bindings — do not commit
BASE44_APP_ID=
BASE44_API_KEY=
GITHUB_PAT=
OPENAI_API_KEY=
SLACK_BOT_TOKEN=
EOF
  echo "  ✓ .env created (fill in secrets)"
else
  echo "  · .env already present"
fi

# Ensure root package.json exists
if [[ ! -f package.json ]]; then
  echo "  ✗ package.json missing — restore from repo template"
  exit 1
fi

echo "▸ Done. Next:"
echo "  1. Fill .env secrets"
echo "  2. bun install"
echo "  3. npx base44 whoami   # or npx base44 login"
echo "  4. Phase 2: compile entities → base44/entities/"
echo "  5. Phase 3: push connectors"
echo "  6. Phase 4: deploy functions"
