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
typed=(../scripts)
for folder in app tests; do
  if [ -d "backend/$folder" ]; then typed+=("$folder"); fi
done
(cd backend && python mypy "${typed[@]}")

step "Backend tests"
if find backend/tests -name 'test_*.py' 2>/dev/null | grep -q .; then
  (cd backend && python pytest)
else
  echo "skipped: no backend tests yet (added in step 1 of docs/build-order.md)"
fi

step "Frontend lint"
npm run --silent --prefix frontend lint

step "Frontend formatting"
npm run --silent --prefix frontend format:check

printf '\nAll checks passed.\n'
