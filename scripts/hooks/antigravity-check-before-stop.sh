#!/usr/bin/env bash
# Antigravity hook: an agent may not finish while scripts/check.sh fails.
set -uo pipefail
cd "$(dirname "$0")/../.."
input=$(cat)

# Errors and step limits end the run regardless; only a normal finish is checked.
[ "$(jq -r '.terminationReason' <<<"$input")" = "model_stop" ] || { echo '{}'; exit 0; }
[ -z "$(git status --porcelain 2>/dev/null)" ] && { echo '{}'; exit 0; }

# Antigravity has no stop_hook_active: block once per user message, then let
# the agent stop and report the failure rather than loop forever.
turn=$(jq -r '.conversationId + "\n" + (.lastUserInput // "")' <<<"$input" | shasum | cut -c1-16)
marker="${TMPDIR:-/tmp}/binsight-stop-blocked-$turn"
[ -e "$marker" ] && { echo '{}'; exit 0; }

if ! output=$(scripts/check.sh 2>&1); then
  touch "$marker"
  reason=$(printf 'scripts/check.sh failed. Fix this before finishing, or say plainly that it is failing:\n%s' "$(tail -40 <<<"$output")")
  jq -cn --arg reason "$reason" '{decision: "continue", reason: $reason}'
  exit 0
fi
echo '{}'
