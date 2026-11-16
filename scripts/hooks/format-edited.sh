#!/usr/bin/env bash
# Claude Code hook: format a file right after it is written or edited.
# Never blocks; scripts/check.sh is what enforces formatting.
set -uo pipefail
cd "$(dirname "$0")/../.."

file=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -f "$file" ] || exit 0

case "$file" in
  *.py)
    uv run --project backend --locked ruff format --quiet "$file"
    ;;
  */frontend/*.ts | */frontend/*.tsx | */frontend/*.mjs)
    (cd frontend && npx --no-install eslint --fix --no-warn-ignored "$file" >/dev/null)
    ;;
esac
exit 0
