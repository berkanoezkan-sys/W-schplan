#!/usr/bin/env bash
# Cursor hook: start Woeschplan dev stack when the workspace opens.
set -euo pipefail

cat >/dev/null

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="$ROOT/.cursor/dev-autostart.log"
DISABLE="$ROOT/.cursor/disable-auto-start"

mkdir -p "$ROOT/.cursor"

if [[ -f "$DISABLE" ]]; then
  echo '{"additional_context":"Woeschplan auto-start is disabled (.cursor/disable-auto-start). Remove that file or run npm run dev:up manually."}'
  exit 0
fi

nohup "$ROOT/scripts/dev-auto-start.sh" >/dev/null 2>&1 &

echo "{\"additional_context\":\"Woeschplan dev auto-start is running in the background (Colima, Postgres, API :3001, Expo :8081). Log: .cursor/dev-autostart.log. If services fail, run npm run dev:up or use the Desktop shortcut. To disable auto-start, create .cursor/disable-auto-start.\"}"
exit 0
