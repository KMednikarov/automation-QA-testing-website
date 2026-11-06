#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f frontend/dist/index.html ]]; then
  echo 'Run bash scripts/setup.sh first.' >&2
  exit 1
fi
exec .venv/bin/python -m uvicorn backend.app:app --host 0.0.0.0 --port "${PORT:-8000}"
