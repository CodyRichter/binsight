# 0007: Rules are enforced by tools, not prose

Status: Accepted

## Context

Most of this project's code will be written with coding agents. Written
rules shape what an agent does but do not guarantee it, and a rule that is
only written down erodes one exception at a time.

## Decision

- Any rule with no exceptions is checked by a tool that fails the build:
  the linters, the repository layout check, the structural tests, or a
  Claude Code hook.
- `scripts/check.sh` is the one command that runs every check. It runs
  locally, in continuous integration, and before an agent is allowed to
  finish.
- `AGENTS.md` files hold guidance and judgment. When a rule becomes
  enforceable, the enforcement is added and the prose is shortened.
- When a rule keeps being broken, the fix is a check, not stronger wording.

## Why

- A failing check is unambiguous to a person and to an agent.
- Short instruction files are followed more reliably than long ones.
- New contributors learn the rules by running one command.

## Cost

- Checks need writing and maintaining, and a wrong check blocks good work
  until it is fixed.
- Some rules cannot be checked mechanically and stay as prose.
- The check script must stay fast enough to run every time an agent
  finishes. The end-to-end tests are therefore not part of it: they run as
  their own step in continuous integration and on demand locally.
