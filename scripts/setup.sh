#!/usr/bin/env bash
# Install everything needed to work on Binsight. Needs uv and Node 24+.
set -euo pipefail
cd "$(dirname "$0")/.."

uv sync --project backend --locked
npm ci --prefix frontend
