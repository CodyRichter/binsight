#!/usr/bin/env bash
# Claude Code and Antigravity hook: format a file right after it is written or edited.
# Never blocks; scripts/check.sh is what enforces formatting.
set -uo pipefail
cd "$(dirname "$0")/../.."

file=$(jq -r '.tool_response.filePath // .tool_input.file_path // .toolCall.args.TargetFile // empty')
# Antigravity reads a PostToolUse hook's stdout as JSON; formatter output goes to stderr.
echo '{}'
[ -f "$file" ] || exit 0
exec >&2

case "$file" in
  *.py)
    uv run --project backend --locked ruff format --quiet "$file"
    ;;
  */frontend/*.ts | */frontend/*.tsx | */frontend/*.mjs)
    (
      cd frontend
      npx --no-install prettier --write --log-level warn "$file"
      npx --no-install eslint --fix --no-warn-ignored "$file" >/dev/null
    )
    ;;
  */frontend/*.json | */frontend/*.css | */frontend/*.html)
    (cd frontend && npx --no-install prettier --write --log-level warn "$file")
    ;;
esac
exit 0
