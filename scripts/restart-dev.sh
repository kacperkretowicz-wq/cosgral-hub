#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Stopping old Next.js processes..."
pkill -f "OFERTA COSGRAL JUICY.*next" 2>/dev/null || true
pkill -f "next dev.*3000" 2>/dev/null || true
sleep 2

echo "Clearing .next cache..."
rm -rf .next

echo "Starting dev server (Node 22 + Turbopack)..."
./scripts/dev.sh > dev-server.log 2>&1 &

echo "Waiting for server..."
for i in $(seq 1 30); do
  if curl -s -m 2 http://127.0.0.1:3000/admin/login >/dev/null 2>&1; then
    echo "Ready: http://127.0.0.1:3000/admin/login"
    exit 0
  fi
  sleep 2
done

echo "Server starting — check dev-server.log (first compile may take ~30s)"
tail -5 dev-server.log
