#!/usr/bin/env bash
# Run a command with Node/npm on PATH (works when Cursor terminal skips nvm).
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

if ! command -v node >/dev/null 2>&1; then
  for node_bin in "$NVM_DIR"/versions/node/*/bin; do
    if [ -x "$node_bin/node" ]; then
      export PATH="$node_bin:$PATH"
      break
    fi
  done
fi

exec "$@"
