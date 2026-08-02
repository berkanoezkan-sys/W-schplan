#!/usr/bin/env bash
# Export Wöschplan + Cursor data for Mac → PC migration.
# Run BEFORE wiping the Mac. Output: ~/Woeschplan-Migration-Backup/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP="${WOESCHPLAN_MIGRATION_DIR:-$HOME/Woeschplan-Migration-Backup}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP/$STAMP"

CURSOR_PROJECT="$HOME/.cursor/projects/Users-berkanprivat-Woeschplan"
CURSOR_WORKSPACE="$HOME/Library/Application Support/Cursor/User/workspaceStorage"

echo "→ Creating backup at $DEST"
mkdir -p "$DEST/backup/env" "$DEST/backup/agent-transcripts" "$DEST/backup/docs"

# Env files (secrets — keep private, never commit to git)
if [[ -f "$ROOT/apps/api/.env" ]]; then
  cp "$ROOT/apps/api/.env" "$DEST/backup/env/apps-api.env"
  echo "  ✓ apps/api/.env"
fi
if [[ -f "$ROOT/apps/mobile/.env" ]]; then
  cp "$ROOT/apps/mobile/.env" "$DEST/backup/env/apps-mobile.env"
  echo "  ✓ apps/mobile/.env"
fi

# Agent transcripts (reference archive)
if [[ -d "$CURSOR_PROJECT/agent-transcripts" ]]; then
  cp -R "$CURSOR_PROJECT/agent-transcripts/." "$DEST/backup/agent-transcripts/"
  COUNT="$(find "$DEST/backup/agent-transcripts" -name '*.jsonl' | wc -l | tr -d ' ')"
  echo "  ✓ $COUNT agent transcript files"
fi

# Migration doc copy
cp "$ROOT/docs/MIGRATION-PC.md" "$DEST/backup/docs/MIGRATION-PC.md"

# Git state snapshot
{
  echo "Repo: $ROOT"
  echo "Date: $(date -Iseconds)"
  echo "Branch: $(git -C "$ROOT" branch --show-current 2>/dev/null || echo '?')"
  echo "Remote: $(git -C "$ROOT" remote get-url origin 2>/dev/null || echo '?')"
  echo ""
  git -C "$ROOT" status -sb 2>/dev/null || true
} > "$DEST/git-status.txt"

# Chat import instructions
cat > "$DEST/CHAT-IMPORT.txt" <<'EOF'
Cursor Chats sind NICHT cloud-synchronisiert.

Empfohlen:
1. Extension "Cursor Chat Transfer" im Mac-Cursor installieren
2. Alle Chats exportieren → .cursor-chat.json in diesen Backup-Ordner legen
3. Auf dem PC: gleiche Extension → Import → Cursor KOMPLETT neu starten

Optional (Mac, vor Löschung):
  ~/Library/Application Support/Cursor/User/workspaceStorage
  (groß, plattformspezifisch — nur mit Chat-Transfer-Extension sinnvoll)

Agent-Transcripts (JSONL) liegen in backup/agent-transcripts/ zum Nachlesen.
EOF

# Latest symlink
rm -f "$BACKUP/latest"
ln -s "$STAMP" "$BACKUP/latest"

echo ""
echo "✓ Backup complete: $DEST"
echo ""
echo "NEXT STEPS (before wiping Mac):"
echo "  1. Copy $BACKUP to USB / cloud"
echo "  2. git add -A && git commit && git push   (in $ROOT)"
echo "  3. Export chats via Cursor Chat Transfer extension"
echo "  4. On PC: clone repo + restore .env from backup + read docs/MIGRATION-PC.md"
