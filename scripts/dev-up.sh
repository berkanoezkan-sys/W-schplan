#!/usr/bin/env bash
# Start the full Wöschplan dev stack after a reboot or fresh session.
# Usage: ./scripts/dev-up.sh [--localhost]
#   --localhost  Expo for Expo Go on the same Mac (default: --host lan for phone)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPO_MODE="lan"
if [[ "${1:-}" == "--localhost" ]]; then
  EXPO_MODE="localhost"
elif [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: ./scripts/dev-up.sh [--localhost]"
  echo "  Starts Postgres, API (:3001), and Expo (:8081)."
  echo "  --localhost  Use exp://localhost:8081 (Expo Go on this Mac)"
  echo "  (default)    Use LAN host for iPhone on same Wi‑Fi"
  exit 0
fi

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

command -v docker >/dev/null || { echo "Docker is required. Install Docker Desktop and retry."; exit 1; }
command -v node >/dev/null || { echo "Node.js 20+ is required."; exit 1; }

if [[ ! -f apps/api/.env ]]; then
  echo "→ Creating apps/api/.env from .env.example"
  cp apps/api/.env.example apps/api/.env
fi

if [[ ! -f apps/mobile/.env ]]; then
  echo "→ Creating apps/mobile/.env from .env.example"
  cp apps/mobile/.env.example apps/mobile/.env
fi

# Keep mobile API URL in sync with current LAN IP when testing on a phone.
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [[ -n "$LAN_IP" && "$EXPO_MODE" == "lan" ]]; then
  EXPECTED="http://${LAN_IP}:3001"
  if ! grep -q "^EXPO_PUBLIC_API_URL=${EXPECTED}$" apps/mobile/.env 2>/dev/null; then
    if grep -q "^EXPO_PUBLIC_API_URL=" apps/mobile/.env; then
      sed -i '' "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${EXPECTED}|" apps/mobile/.env
    else
      echo "EXPO_PUBLIC_API_URL=${EXPECTED}" >> apps/mobile/.env
    fi
    echo "→ Updated apps/mobile/.env EXPO_PUBLIC_API_URL=${EXPECTED}"
  fi
fi

API_PID=""
cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "→ Starting PostgreSQL (docker compose up -d)…"
docker compose up -d

echo "→ Waiting for Postgres…"
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U woeschplan -d woeschplan >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "→ Stopping stale dev servers on :3001 and Expo…"
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 1

echo "→ Starting API on http://localhost:3001…"
npm run dev:api &
API_PID=$!

echo "→ Waiting for API /health…"
for _ in $(seq 1 60); do
  if curl -sf http://localhost:3001/health >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API process exited unexpectedly."
    exit 1
  fi
  sleep 1
done

if ! curl -sf http://localhost:3001/health >/dev/null 2>&1; then
  echo "API did not become healthy in time."
  exit 1
fi

EXPO_PUBLIC_API_URL="$(grep -E '^EXPO_PUBLIC_API_URL=' apps/mobile/.env | cut -d= -f2- | tr -d '"' || echo 'http://localhost:3001')"
export EXPO_PUBLIC_API_URL

echo ""
echo "✓ Stack ready"
echo "  API:    http://localhost:3001/health"
echo "  Expo:   http://localhost:8081"
echo "  API URL for mobile: ${EXPO_PUBLIC_API_URL}"
if [[ "$EXPO_MODE" == "localhost" ]]; then
  echo "  Open on this Mac: open \"exp://localhost:8081\""
fi
echo ""
echo "→ Starting Expo (--${EXPO_MODE})… Press Ctrl+C to stop API and Expo."
echo ""

cd apps/mobile
if [[ "$EXPO_MODE" == "localhost" ]]; then
  exec npx expo start --localhost
else
  exec npx expo start --host lan
fi
