#!/usr/bin/env bash
# The one command that says whether the repository is in a good state.
# Runs locally, in continuous integration, and before an agent may finish.
set -euo pipefail
cd "$(dirname "$0")/.."
root=$PWD

step() { printf '\n== %s\n' "$1"; }
python() { uv run --project "$root/backend" --locked "$@"; }

step "Repository layout and size limits"
python python scripts/check_repo.py

step "Python lint"
python ruff check .

step "Python formatting"
python ruff format --check .

step "Python types"
(cd backend && python mypy app migrations tests ../scripts)

step "Backend tests"
(cd backend && python pytest)

step "Generated API types"
generated="$(mktemp -d)/api.generated.ts"
(cd backend && python python -m app.export_openapi) |
  frontend/node_modules/.bin/openapi-typescript --output "$generated" >/dev/null 2>&1
if ! diff -u frontend/src/types/api.generated.ts "$generated"; then
  echo "frontend/src/types/api.generated.ts is stale: run 'npm run generate:types' in frontend/"
  exit 1
fi

step "Frontend lint"
npm run --silent --prefix frontend lint

step "Frontend formatting"
npm run --silent --prefix frontend format:check

step "Frontend types"
npm run --silent --prefix frontend typecheck

step "Frontend tests"
npm run --silent --prefix frontend test

step "Frontend build"
npm run --silent --prefix frontend build

printf '\nAll checks passed.\n'
