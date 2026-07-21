#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo ">> [SYSTEM] INITIALIZING VELOCITY MATRIX BOOTSTRAP..."
echo ">> [SYSTEM] Scanning for agents/ documentation directory..."

if [ ! -d "agents" ]; then
  echo ">> [FATAL] agents/ directory not found. Halting execution."
  exit 1
fi

# ---------------------------------------------------------
# PHASE 1: Workspace Bootstrapping & Identity
# ---------------------------------------------------------
echo ">> [PHASE 1] Bootstrapping Base44 Environment..."
mkdir -p base44/auth base44/entities base44/functions base44/connectors

# Scaffold root configurations from agent blueprints
cp agents/09_package.json package.json
cp agents/07_base44_config.jsonc base44/config.jsonc
cp agents/08_auth_config.jsonc base44/auth/config.jsonc

echo ">> [SYSTEM] Installing Base44 SDK and dependencies..."
npm install --silent

# ---------------------------------------------------------
# PHASE 2: The Ontological Grid & Access Control
# ---------------------------------------------------------
echo ">> [PHASE 2] Provisioning Schemas and Row-Level Security..."
cp agents/02_entity_schemas.ts base44/entities/schema.ts
cp agents/05_security_and_rls.ts base44/entities/security.ts

# ---------------------------------------------------------
# PHASE 3: Exocortex Integration (Connectors)
# ---------------------------------------------------------
echo ">> [PHASE 3] Registering Third-Party Connectors..."
cp agents/06_connector_manifest.json base44/connectors/manifest.json

# Check for environment variables before proceeding
if [ ! -f ".env" ]; then
  echo ">> [WARNING] .env file missing. Connector injection may fail."
  echo ">> [SYSTEM] Generating blank .env template..."
  echo "GITHUB_PAT=\nSLACK_BOT_TOKEN=\nLLM_API_KEY=" > .env
fi

# ---------------------------------------------------------
# PHASE 4: Autonomous Synapses (Business Logic)
# ---------------------------------------------------------
echo ">> [PHASE 4] Deploying Deno Serverless Functions..."
cp agents/03_backend_logic.ts base44/functions/index.ts

# ---------------------------------------------------------
# PHASE 5: Telemetry, Evals & Deployment
# ---------------------------------------------------------
echo ">> [PHASE 5] Executing AI Initialization Evals..."
# Assuming a custom script to run the AI evals defined earlier
if npm run evals:run; then
    echo ">> [EVALS] PASSED. RLS and Payload contracts verified."
else
    echo ">> [FATAL] AI Evals failed. Aborting deployment to prevent matrix corruption."
    exit 1
fi

echo ">> [SYSTEM] Pushing Architecture to Base44 Cloud..."
npx base44 deploy -y

echo ">> [SYSTEM] VELOCITY MATRIX ONLINE. Awaiting voice input."