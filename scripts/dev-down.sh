#!/usr/bin/env bash
# Stop Wöschplan dev servers (API, Expo). Postgres keeps running unless --all.
# Usage: ./scripts/dev-down.sh [--all]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STOP_DB=false
if [[ "${1:-}" == "--all" ]]; then
  STOP_DB=true
elif [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: ./scripts/dev-down.sh [--all]"
  echo "  Stops API (:3001) and Expo dev servers."
  echo "  --all  Also stops Postgres (docker compose down)"
  exit 0
fi

echo "→ Stopping API on :3001…"
lsof -ti :3001 | xargs kill -9 2>/dev/null || true

echo "→ Stopping Expo…"
pkill -f "expo start" 2>/dev/null || true
lsof -ti :8081 | xargs kill -9 2>/dev/null || true

if [[ "$STOP_DB" == true ]]; then
  echo "→ Stopping Postgres (docker compose down)…"
  docker compose down
fi

echo "✓ Dev servers stopped."
