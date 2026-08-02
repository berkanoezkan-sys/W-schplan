#!/usr/bin/env bash
# Restore Wöschplan on a new PC from iCloud migration backup.
# Finds: iCloud Drive/Berkans Dokumente/Woeschplan-Migration-Backup/latest
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
MARKER="$ROOT/.cursor/pc-restore-complete"
BACKUP_NAME="Woeschplan-Migration-Backup/latest"

find_backup() {
  local candidates=(
    "$HOME/iCloudDrive/Berkans Dokumente/$BACKUP_NAME"
    "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Berkans Dokumente/$BACKUP_NAME"
    "/mnt/c/Users/$USER/iCloudDrive/Berkans Dokumente/$BACKUP_NAME"
  )
  if [[ -n "${WOESCHPLAN_BACKUP_DIR:-}" && -d "$WOESCHPLAN_BACKUP_DIR" ]]; then
    echo "$WOESCHPLAN_BACKUP_DIR"
    return 0
  fi
  for dir in "${candidates[@]}"; do
    if [[ -d "$dir" ]]; then
      echo "$dir"
      return 0
    fi
  done
  return 1
}

echo "→ Wöschplan PC restore"
BACKUP="$(find_backup)" || {
  echo "Backup not found. Wait for iCloud sync, then set:"
  echo "  export WOESCHPLAN_BACKUP_DIR=/path/to/Woeschplan-Migration-Backup/latest"
  exit 1
}
echo "  Backup: $BACKUP"

mkdir -p "$ROOT/.cursor" "$ROOT/apps/api" "$ROOT/apps/mobile"

if [[ -f "$BACKUP/backup/env/apps-api.env" ]]; then
  cp "$BACKUP/backup/env/apps-api.env" "$ROOT/apps/api/.env"
  echo "  ✓ apps/api/.env restored"
fi
if [[ -f "$BACKUP/backup/env/apps-mobile.env" ]]; then
  cp "$BACKUP/backup/env/apps-mobile.env" "$ROOT/apps/mobile/.env"
  echo "  ✓ apps/mobile/.env restored (update LAN IP if needed)"
fi

if [[ -f "$BACKUP/woeschplan-cursor-chats.cursor-chat.json" ]]; then
  cp "$BACKUP/woeschplan-cursor-chats.cursor-chat.json" "$ROOT/.cursor/woeschplan-cursor-chats.cursor-chat.json"
  echo "  ✓ Chat export copied to .cursor/woeschplan-cursor-chats.cursor-chat.json"
fi

echo "→ npm install"
npm install

echo "→ Docker Postgres"
docker compose up -d
sleep 5

echo "→ Database migrate + seed"
npm run db:migrate
npm run db:seed

{
  echo "restoredAt=$(date -Iseconds)"
  echo "backup=$BACKUP"
} > "$MARKER"

echo ""
echo "✓ PC restore complete"
echo "  Marker: $MARKER"
echo "  Dev start: npm run dev:up"
echo "  Chat import: Extension 'Cursor Chat Transfer' → Import → .cursor/woeschplan-cursor-chats.cursor-chat.json"
echo "  Full agent logs: $BACKUP/backup/agent-transcripts/ (read-only archive)"
if [[ -f "$BACKUP/CHAT-IMPORT.txt" ]]; then
  echo ""
  cat "$BACKUP/CHAT-IMPORT.txt"
fi
