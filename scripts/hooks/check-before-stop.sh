#!/usr/bin/env bash
# Claude Code hook: an agent may not finish while scripts/check.sh fails.
set -uo pipefail
cd "$(dirname "$0")/../.."

# Already blocked once this turn: let the agent stop and report the failure
# rather than loop forever.
[ "$(jq -r '.stop_hook_active // false')" = "true" ] && exit 0

# Nothing changed since the last commit: nothing to check.
[ -z "$(git status --porcelain 2>/dev/null)" ] && exit 0

if ! output=$(scripts/check.sh 2>&1); then
  {
    echo "scripts/check.sh failed. Fix this before finishing, or say plainly that it is failing:"
    echo "$output" | tail -40
  } >&2
  exit 2
fi
