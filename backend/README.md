# Binsight backend

The FastAPI application: the web API the frontend calls, and the MCP server
Claude calls, in one process.

> **Status: foundations.** Tooling is set up; no application code yet. This describes the intended stack and
> layout.

## Tech stack

| Purpose            | Choice                                           |
| ------------------ | ------------------------------------------------ |
| Language           | Python 3.14+                                     |
| Web framework      | FastAPI                                          |
| Database           | SQLite, one file, write-ahead-log mode           |
| Database access    | SQLAlchemy 2                                     |
| Schema migrations  | Alembic, using batch mode for SQLite             |
| Validation         | Pydantic v2                                      |
| MCP server         | The official `mcp` Python SDK, served at `/mcp`  |
| Images             | Pillow, for resizing photos and thumbnails       |
| Tests              | pytest                                           |
| Lint and format    | ruff                                             |

## Layout

```
backend/
├── app/
│   ├── core/            Settings, database setup, shared errors
│   ├── models/          Database tables, all in one place
│   ├── features/        One folder per feature
│   └── mcp/             MCP server and its tools
├── migrations/
│   └── versions/        Alembic migrations
└── tests/
    ├── features/        Tests per feature
    └── mcp/             Tests for the MCP tools
```

Each folder under `app/features/` has the same three files:

| File         | Holds                                                        |
| ------------ | ------------------------------------------------------------ |
| `service.py` | The feature's rules and database work. The only place behavior lives. |
| `schemas.py` | Pydantic shapes for requests and responses                   |
| `routes.py`  | Web API endpoints. Thin: validate, call `service.py`, return. |

The MCP tools in `app/mcp/` call the same `service.py` functions as the
routes, so the app and Claude always behave the same.

The feature list and what each covers is in the
[root README](../README.md#features).

## How SQLite is used

- One backend process. The MCP server runs inside it, not beside it.
- Write-ahead-log mode, a busy timeout of a few seconds, and write
  transactions that take the lock up front.
- The database file lives in the data directory on local disk, never on a
  network share.
- Photos and files are stored on disk in the data directory. The database
  holds their paths, not their bytes.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
