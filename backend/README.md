# Binsight backend

The FastAPI application: the web API the frontend calls, the MCP server
Claude calls, and the frontend's built files, in one process.

> **Status: sign-in (phase B2).** The app starts, opens SQLite with the
> agreed settings, migrates the database and serves the frontend's files.
> `auth` creates the owner and signs devices in; every other API route
> needs a session.

## Tech stack

| Purpose            | Choice                                           |
| ------------------ | ------------------------------------------------ |
| Language           | Python 3.14+                                     |
| Web framework      | FastAPI                                          |
| Database           | SQLite, one file, write-ahead-log mode           |
| Database access    | SQLAlchemy 2                                     |
| Schema migrations  | Alembic, using batch mode for SQLite             |
| Validation         | Pydantic v2                                      |
| MCP server         | The official `mcp` Python SDK, streamable HTTP at `/mcp` |
| Images             | Pillow, for resizing photos and thumbnails       |
| Tests              | pytest                                           |
| Lint and format    | ruff                                             |
| Type checks        | mypy, strict                                     |

The server is uvicorn. `segno` draws label QR codes, and
`python-multipart` reads photo uploads.

## Running it

From `backend/`, with a data directory of your choosing:

```
BINSIGHT_APP_ADDRESS=http://localhost:8000 BINSIGHT_DATA_DIRECTORY=../data \
  uv run uvicorn app.main:create_app --factory
```

The API is under `/api`, its generated description at `/api/docs`. Every
other path serves `../frontend/dist`, so run `npm run build` there first.
After changing a route or schema, run `npm run generate:types` in
`frontend/` and commit the result.

New migrations are written with `uv run alembic revision --autogenerate`,
with the same two settings pointing at a scratch data directory. The app
applies them itself at startup, after copying the database into
`backups/`. Migrations only go forward; to go back, restore that copy.

## Layout

The folder tree is in the [root README](../README.md#repository-layout), and
the feature list is [below it](../README.md#features). Each folder under
`app/features/` has the same three files:

| File         | Holds                                                        |
| ------------ | ------------------------------------------------------------ |
| `service.py` | The feature's public functions. The only file anything outside the feature calls. |
| `schemas.py` | Pydantic shapes for requests and responses                   |
| `routes.py`  | Web API endpoints. Thin: validate, call `service.py`, return. |

A feature that outgrows `service.py` adds files beside it, each named for
what it does ([decision 0003](../docs/decisions/0003-feature-folders.md)).

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
