#!/usr/bin/env bash
# Restore Wöschplan on a new PC from iCloud migration backup.
# Finds: iCloud Drive/Berkans Dokumente/Woeschplan-Migration-Backup/latest
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
MARKER="$ROOT/.cursor/pc-restore-complete"
is_backup_root() {
  [[ -d "$1/backup/env" ]]
}

resolve_backup_root() {
  local path="$1"
  [[ -d "$path" ]] || return 1
  if is_backup_root "$path"; then
    echo "$path"
    return 0
  fi
  if [[ -d "$path/latest" ]]; then
    resolve_backup_root "$path/latest" && return 0
  fi
  local newest dir
  for dir in $(ls -1d "$path"/*/ 2>/dev/null | sort -r); do
    if is_backup_root "$dir"; then
      newest="${dir%/}"
      break
    fi
  done
  if [[ -n "$newest" ]]; then
    echo "${newest%/}"
    return 0
  fi
  return 1
}

find_backup() {
  if [[ -n "${WOESCHPLAN_BACKUP_DIR:-}" ]]; then
    resolve_backup_root "$WOESCHPLAN_BACKUP_DIR" && return 0
  fi
  local candidates=(
    "$HOME/iCloudDrive/Berkans Dokumente/Woeschplan-Migration-Backup"
    "$HOME/iCloudDrive/Berkans Dokumente/Woeschplan-Migration-Backup/latest"
    "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Berkans Dokumente/Woeschplan-Migration-Backup"
    "/mnt/c/Users/moezkan/iCloudDrive/Berkans Dokumente/Woeschplan-Migration-Backup"
    "/mnt/c/Users/$USER/iCloudDrive/Berkans Dokumente/Woeschplan-Migration-Backup"
  )
  local dir resolved
  for dir in "${candidates[@]}"; do
    resolved="$(resolve_backup_root "$dir" 2>/dev/null || true)"
    if [[ -n "$resolved" ]]; then
      echo "$resolved"
      return 0
    fi
  done
  return 1
}

echo "→ Wöschplan PC restore"
BACKUP="$(find_backup)" || {
  echo "Backup not found. Wait for iCloud sync, then set:"
  echo "  export WOESCHPLAN_BACKUP_DIR=\"/mnt/c/Users/moezkan/iCloudDrive/Berkans Dokumente/Woeschplan-Migration-Backup\""
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
