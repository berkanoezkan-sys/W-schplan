#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
GH_BIN="${GH_BIN:-gh}"

echo "→ Checking prerequisites…"
command -v git >/dev/null || { echo "Install Xcode Command Line Tools first: xcode-select --install"; exit 1; }
command -v "$GH_BIN" >/dev/null || { echo "Install GitHub CLI: https://cli.github.com"; exit 1; }

cd "$ROOT"

if [ ! -d .git ]; then
  git init
  git branch -M main
fi

if ! "$GH_BIN" auth status >/dev/null 2>&1; then
  echo "→ Log in to GitHub (follow the prompts):"
  "$GH_BIN" auth login
fi

echo "→ Creating GitHub repository 'Wöschplan'…"
"$GH_BIN" repo create Wöschplan \
  --public \
  --source=. \
  --remote=origin \
  --description "Shared laundry scheduling for Swiss apartment buildings" \
  --push \
  || {
    echo "If the repo already exists, run:"
    echo "  git remote add origin https://github.com/YOUR_USER/Wöschplan.git"
    echo "  git push -u origin main"
  }

echo "Done."
