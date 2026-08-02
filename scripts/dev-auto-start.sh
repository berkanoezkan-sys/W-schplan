#!/usr/bin/env bash
# Idempotent dev stack startup for Cursor hooks and background use.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="$ROOT/.cursor/dev-autostart.log"
LOCK="/tmp/woeschplan-dev-autostart.lock"
DISABLE="$ROOT/.cursor/disable-auto-start"

mkdir -p "$ROOT/.cursor"

if [[ -f "$DISABLE" ]]; then
  echo "$(date -Iseconds) auto-start skipped ($DISABLE exists)" >> "$LOG"
  exit 0
fi

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Iseconds) auto-start skipped (another run in progress)" >> "$LOG"
  exit 0
fi

{
  echo ""
  echo "=== $(date -Iseconds) auto-start ==="

  if curl -sf http://localhost:3001/health >/dev/null 2>&1 && lsof -ti :8081 >/dev/null 2>&1; then
    echo "Dev stack already running (API + Expo)."
    exit 0
  fi

  EXPO_FLAG=""
  if [[ "${WOESCHPLAN_EXPO_MODE:-lan}" == "localhost" ]]; then
    EXPO_FLAG="--localhost"
  fi

  "$ROOT/scripts/dev-up.sh" --background $EXPO_FLAG
} >> "$LOG" 2>&1
