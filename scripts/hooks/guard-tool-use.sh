#!/usr/bin/env bash
# Antigravity hook: the same denials .claude/settings.json gives Claude Code.
set -uo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
input=$(cat)
tool=$(jq -r '.toolCall.name' <<<"$input")

decide() {
  jq -cn --arg decision "$1" --arg reason "${2:-}" \
    '{decision: $decision} + (if $reason == "" then {} else {reason: $reason} end)'
  exit 0
}

check_command() {
  local command
  command=$(jq -r '.toolCall.args.CommandLine // empty' <<<"$input")
  case "$command" in
    scripts/check.sh | ./scripts/check.sh) decide auto_approve ;;
  esac
  if grep -qE 'git push( .*)? (--force|-f)( |$)' <<<"$command"; then
    decide deny "Force-pushing is not allowed in this repository."
  fi
  if grep -qE 'git commit( .*)? --no-verify( |$)' <<<"$command"; then
    decide deny "Committing with --no-verify is not allowed in this repository."
  fi
  decide allow
}

check_path() {
  local path relative
  path=$(jq -r '.toolCall.args | .AbsolutePath // .TargetFile // .DirectoryPath // .SearchPath // .SearchDirectory // empty' <<<"$input")
  relative=${path#"$repo"/}
  case "$(basename "$relative")" in
    .env | .env.local) decide deny "Agents may not read or change .env files." ;;
  esac
  case "$relative" in
    data | data/*) decide deny "Agents may not read or change the data directory." ;;
  esac
  case "$tool:$relative" in
    view_file:* | list_dir:* | find_by_name:* | grep_search:*) ;;
    *:frontend/src/types/api.generated.ts) decide deny "This file is generated; run the type generation instead." ;;
    *:LICENSE) decide deny "Agents may not change LICENSE." ;;
  esac
  decide allow
}

if [ "$tool" = run_command ]; then check_command; else check_path; fi
