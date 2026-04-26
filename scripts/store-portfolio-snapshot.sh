#!/usr/bin/env bash

# ==============================================================================
# bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
# Purpose
# - Wrapper script for running your scheduled job on a VPS.
# - Safe for cron because it sets the working directory explicitly.
# - Loads variables from .env in the project root.
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
#    chmod +x /home/youruser/apps/bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
# 2. Create the .env in the PROJECT ROOT, not inside scripts/:
#    /home/youruser/apps/bybit-quant-dashboard/.env
#
# 3. Lock down the .env permissions:
#    chmod 600 /home/youruser/apps/bybit-quant-dashboard/.env
#
# 4. Test manually before using cron:
#    /home/youruser/apps/bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
# 5. Add a cron entry:
#    crontab -e
#
# 6. Example cron entries:
#    Every 5 minutes:
#    */5 * * * * /home/youruser/apps/bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
#    Every hour:
#    0 * * * * /home/youruser/apps/bybit-quant-dashboard/scripts/store-portfolio-snapshot.sh
#
# 7. Watch logs:
#    tail -f /home/youruser/logs/bybit-quant-dashboard/cron.log
#
# 8. If your code changes:
#    cd /home/youruser/apps/bybit-quant-dashboard
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

# Explicit PATH for cron safety
export PATH="/usr/local/bin:/usr/bin:/bin"

# Create log directory if missing
mkdir -p "$LOG_DIR"

# Move into project root so relative paths inside your app work
cd "$PROJECT_DIR"

# Load environment variables from .env in project root
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: .env not found in $PROJECT_DIR" >> "$LOG_FILE"
  exit 1
fi

# Log start
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Job started" >> "$LOG_FILE"

# ==============================================================================
# RUN COMMAND
# Default command uses package.json script "sync:portfolio".
# Edit this section if you prefer a different command.
# ==============================================================================

# Example alternatives:
# /usr/bin/npx tsx scripts/store-portfolio-snapshot.ts >> "$LOG_FILE" 2>&1
# /usr/bin/node dist/scripts/store-portfolio-snapshot.js >> "$LOG_FILE" 2>&1

if /usr/bin/npm run sync:portfolio >> "$LOG_FILE" 2>&1; then
  EXIT_CODE=0
else
  EXIT_CODE=$?
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Job finished with exit code $EXIT_CODE" >> "$LOG_FILE"
exit "$EXIT_CODE"