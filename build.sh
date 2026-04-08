#!/bin/sh
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required" >&2
  exit 1
fi

if ! command -v php >/dev/null 2>&1; then
  echo "php is required" >&2
  exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm --prefix frontend install
fi

echo "Running backend smoke tests..."
php backend/tests/smoke.php

echo "Building frontend..."
ONEDB_EMBEDDED=1 npm --prefix frontend run build

echo "Packaging release/OneDB.php..."
node build/pack-release.mjs

echo "Done. Output: release/OneDB.php"
