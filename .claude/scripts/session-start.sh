#!/usr/bin/env bash
set -euo pipefail

echo "=== Private Pages Session Bootstrap ==="

IS_EPHEMERAL=false
if [[ -f /.dockerenv ]] || [[ "${CODESPACES:-}" == "true" ]] || [[ -n "${CLAUDE_CODE_WEB:-}" ]]; then
  IS_EPHEMERAL=true
  echo "[env] Ephemeral container detected"
fi

if ! command -v mise &>/dev/null; then
  curl https://mise.run | sh
  export PATH="$HOME/.local/bin:$PATH"
fi
echo "[mise] $(mise --version)"

mise install --yes
npm ci
echo "[deps] Dependencies installed"

if ! command -v gs &>/dev/null; then
  go install go.abhg.dev/git-spice@latest 2>/dev/null || \
    brew install git-spice 2>/dev/null || \
    echo "[git-spice] Manual install needed"
fi
if command -v gs &>/dev/null; then
  gs repo init 2>/dev/null || true
fi

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
git fetch origin 2>/dev/null || true
if [[ "$CURRENT_BRANCH" != "main" ]] && command -v gs &>/dev/null; then
  gs repo sync 2>/dev/null || true
  gs repo restack 2>/dev/null || true
fi

npm run validate 2>/dev/null || echo "[validate] Some checks failed"

echo ""
echo "=== Session Ready ==="
if [[ -f "TASKS.md" ]]; then
  grep -n "^\- \[x\]" TASKS.md | tail -3 || true
  echo "..."
  grep -n "^\- \[ \]" TASKS.md | head -3 || true
fi
echo "========================"
