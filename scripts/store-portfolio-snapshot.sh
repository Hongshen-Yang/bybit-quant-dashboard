#!/usr/bin/env bash

# ==============================================================================
# bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
# Purpose
# - Wrapper script for running your scheduled job on a VPS.
# - Safe for cron because it sets the working directory explicitly.
# - Loads variables from .env files in the project root.
# - Writes logs outside the project directory.
#
# Why logs are outside the project
# - The repo may be open source.
# - Logs can contain sensitive output, stack traces, or bad debug dumps.
# - Keeping logs outside the repo avoids accidental commits and clutter.
#
# ==============================================================================
# MANUAL STEPS YOU SHOULD REMEMBER
# ==============================================================================
#
# 1. Make it executable:
#    chmod +x ~/bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
# 2. Create env files in the PROJECT ROOT, not inside scripts/:
#    ~/bybit-quant-dashboard/.env
#    ~/bybit-quant-dashboard/.env.local
#
# 3. Lock down the .env permissions:
#    chmod 600 ~/bybit-quant-dashboard/.env
#
# 4. Test manually before using cron:
#    ~/bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
# 5. Add a cron entry:
#    crontab -e
#
# 6. Example cron entries:
#    Every 5 minutes:
#    */5 * * * * ~/bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
#    Every hour:
#    0 * * * * ~/bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
# 7. Watch logs:
#    tail -f ~/logs/bybit-quant-dashboard/cron.log
#    
# 8. If your code changes:
#    cd ~/bybit-quant-dashboard
#    git pull
#    npm ci
#    npm run build
#
# ==============================================================================
# IMPORTANT THINGS TO EDIT
# ==============================================================================
#
# This script auto-detects:
# - SCRIPT_DIR = .../bybit-quant-dashboard/scripts
# - PROJECT_DIR = .../bybit-quant-dashboard
#
# Then choose ONE run command:
# - npm run sync:portfolio
# - npx tsx scripts/store-portfolio-snapshot.ts
#
# Keep one active command in the RUN COMMAND section below.
#
# ==============================================================================

set -Eeuo pipefail

APP_NAME="bybit-quant-dashboard"

# Directory containing this script, e.g. .../bybit-quant-dashboard/scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root is the parent of scripts/
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Logs live outside the repository
LOG_DIR="$HOME/logs/$APP_NAME"
LOG_FILE="$LOG_DIR/cron.log"

# Explicit PATH for cron safety.
export PATH="/usr/local/bin:/usr/bin:/bin"

# Add Node/NPM from NVM installs for non-interactive cron shells.
if [[ -d "$HOME/.nvm/versions/node" ]]; then
  for node_bin_dir in "$HOME"/.nvm/versions/node/*/bin; do
    if [[ -d "$node_bin_dir" ]]; then
      export PATH="$node_bin_dir:$PATH"
    fi
  done
fi
export TZ="UTC"

# Create log directory if missing
mkdir -p "$LOG_DIR"

# Move into project root so relative paths inside your app work
cd "$PROJECT_DIR"

# Load environment variables with Next.js-like precedence.
# Effective priority (highest to lowest):
# .env.${NODE_ENV}.local > .env.local > .env.${NODE_ENV} > .env
NODE_ENV="${NODE_ENV:-production}"
ENV_FILES=(
  ".env"
  ".env.${NODE_ENV}"
)

if [[ "$NODE_ENV" != "test" ]]; then
  ENV_FILES+=(".env.local")
fi

ENV_FILES+=(".env.${NODE_ENV}.local")

LOADED_ENV_FILE=false
set -a
for env_file in "${ENV_FILES[@]}"; do
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    source "$env_file"
    LOADED_ENV_FILE=true
  fi
done
set +a

if [[ "$LOADED_ENV_FILE" == false ]]; then
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] ERROR: no env file found in $PROJECT_DIR (.env, .env.${NODE_ENV}, .env.local, .env.${NODE_ENV}.local)" >> "$LOG_FILE"
  exit 1
fi

# Log start
echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Job started" >> "$LOG_FILE"

# ==============================================================================
# RUN COMMAND
# Default command uses package.json script "sync:portfolio".
# Edit this section if you prefer a different command.
# ==============================================================================

# Example alternatives:
# /usr/bin/npx tsx scripts/store-portfolio-snapshot.ts >> "$LOG_FILE" 2>&1
# /usr/bin/node dist/scripts/store-portfolio-snapshot.js >> "$LOG_FILE" 2>&1

if command -v npm >/dev/null 2>&1 && npm run sync:portfolio >> "$LOG_FILE" 2>&1; then
  EXIT_CODE=0
else
  EXIT_CODE=$?
  if [[ "$EXIT_CODE" -eq 127 ]]; then
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] ERROR: npm not found in PATH=$PATH" >> "$LOG_FILE"
  fi
fi

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Job finished with exit code $EXIT_CODE" >> "$LOG_FILE"
exit "$EXIT_CODE"