#!/bin/bash
cd "$(dirname "$0")/.."
NODE22="/opt/homebrew/opt/node@22/bin/node"
if [ ! -f "$NODE22" ]; then
  NODE22="node"
fi
export NEXT_TELEMETRY_DISABLED=1
exec "$NODE22" ./node_modules/.bin/next dev --turbo -p 3000 -H 127.0.0.1
