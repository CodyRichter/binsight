# 0002: One backend process, with MCP inside it

Status: Accepted

## Context

SQLite allows one writer at a time. Claude reaches Binsight through an MCP
server and must behave exactly as the app does.

## Decision

The backend runs as exactly one process. The MCP server is part of that
process, served at `/mcp`, not a separate program. The same process serves
the frontend's files ([decision 0008](0008-frontend-served-by-backend.md)).
There are no extra workers, replicas, queues or background services.

SQLite is configured with write-ahead-log mode, a busy timeout, and write
transactions that take the lock up front.

## Why

- With one process, write contention is settled in one place and cannot
  surface as "database is locked" errors between programs.
- MCP tools call the same in-process functions as the web API, so the two
  cannot drift apart.
- One process is the simplest thing to run, watch and reason about.

## Cost

- No horizontal scaling. That is acceptable for one household.
- A slow request can hold up others. Route handlers stay short, and
  anything long, such as an export, must be designed not to hold a write
  transaction open.
- Scheduled work, such as backups, runs inside the same process.
