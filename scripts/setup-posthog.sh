#!/usr/bin/env bash
# PostHog setup for getlavo (Next.js 14 — wizard requires 15.3+, so we configure manually).
set -euo pipefail

cd "$(dirname "$0")/.."
SCRIPT_DIR="$(dirname "$0")"
bash "$SCRIPT_DIR/with-node.sh" true >/dev/null 2>&1 || true

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
for node_bin in "$NVM_DIR"/versions/node/*/bin; do
  if [ -x "$node_bin/node" ]; then export PATH="$node_bin:$PATH"; break; fi
done

ENV_FILE=".env.local"
KEY_LINE="POSTHOG_KEY="

echo ""
echo "PostHog wizard does not support Next.js 14 (this project uses 14.2.13)."
echo "PostHog is already wired in the app — you only need your project API key."
echo ""
echo "1. Open PostHog → Project Settings → Project API key (starts with phc_)"
echo "2. Paste it below (input is hidden):"
echo ""
read -r -s PHC_KEY
echo ""

if [ -z "$PHC_KEY" ]; then
  echo "No key entered. Edit $ENV_FILE manually:"
  echo "  POSTHOG_KEY=phc_your_key_here"
  exit 1
fi

touch "$ENV_FILE"
if grep -q "^POSTHOG_KEY=" "$ENV_FILE" 2>/dev/null; then
  sed -i '' "s|^POSTHOG_KEY=.*|POSTHOG_KEY=$PHC_KEY|" "$ENV_FILE"
else
  echo "POSTHOG_KEY=$PHC_KEY" >> "$ENV_FILE"
fi

echo "Saved POSTHOG_KEY to $ENV_FILE"
echo ""
echo "Start the app:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 — PostHog should receive events."
echo "For production: add POSTHOG_KEY in Vercel → Environment Variables → Redeploy."
echo ""
