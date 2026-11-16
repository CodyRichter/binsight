# 0001: SQLite is the only database

Status: Accepted

## Context

Binsight serves one household and one main user, holds a few thousand items,
and must be simple to run and back up. The requirements ask for one service
and one place where all data lives.

## Decision

Use SQLite, in write-ahead-log mode, as the only supported database. There
is no Postgres option and no layer for swapping databases.

## Why

- No database container, credentials or upgrades to manage.
- A backup is a copy of one folder; a restore is copying it back.
- Write-ahead-log mode allows many readers alongside one writer, which is
  more than this workload needs.
- Supporting two databases would double the testing and rule out using
  either one's features fully.

## Cost

- Typo-tolerant search is not built in, so the backend adds its own fuzzy
  matching pass. At a few thousand items this is fast enough.
- SQLite cannot alter a column in place, so migrations rebuild tables using
  Alembic's batch mode.
- The database file must be on local disk. A network share risks
  corruption.
- Growing to many concurrent writers would mean revisiting this decision.
