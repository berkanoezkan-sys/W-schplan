#!/usr/bin/env bash
# Quick check of what's running for local dev.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

check_port() {
  local name="$1"
  local port="$2"
  if lsof -ti ":$port" >/dev/null 2>&1; then
    echo "  ✓ $name (port $port)"
  else
    echo "  ✗ $name (port $port) — not running"
  fi
}

echo "Wöschplan dev status"
echo ""

if docker compose ps postgres 2>/dev/null | grep -q "Up"; then
  echo "  ✓ Postgres (docker)"
else
  echo "  ✗ Postgres (docker) — run: docker compose up -d"
fi

check_port "API" 3001
check_port "Expo" 8081

if curl -sf http://localhost:3001/health >/dev/null 2>&1; then
  echo "  ✓ API /health"
else
  echo "  ✗ API /health — not responding"
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "?")"
echo ""
echo "LAN IP: ${LAN_IP}"
if [[ -f apps/mobile/.env ]]; then
  grep -E '^EXPO_PUBLIC_API_URL=' apps/mobile/.env || true
fi
