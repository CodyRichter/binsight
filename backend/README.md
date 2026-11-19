# Binsight backend

The FastAPI application: the web API the frontend calls, the MCP server
Claude calls, and the frontend's built files, in one process.

> **Status: labels (phase B6).** The app starts,
> opens SQLite with the agreed settings, migrates the database and serves
> the frontend's files. `auth` makes accounts and signs devices in; each
> API route needs the role `main.py` groups it under, and reading needs none. `locations` creates locations and lists
> the tree, `items` adds items by name and lists a location's items with
> their paths, and `history` records each change in the same transaction.
> `auth` also creates, lists and revokes MCP credentials, and the MCP
> server at `/mcp` has a tool for every one of those actions, recorded with
> the actor `mcp`. Every location is known by a random code such as
> `K7Q-4MZ`; `labels` draws a location's label as a PNG of its QR code and
> code, and MCP tools read a code typed in any case, with or without its
> hyphen.

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
| Images             | Pillow, for label images, and for photos and thumbnails from B7 |
| Tests              | pytest                                           |
| Lint and format    | ruff                                             |
| Type checks        | mypy, strict                                     |

The server is uvicorn. `segno` draws label QR codes, and
`python-multipart` reads photo uploads; `python-multipart` is added in B7,
the phase that first uses it.

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

Claude connects to the MCP server at `/mcp` over streamable HTTP, sending
an MCP credential as a bearer token. Make one in `/settings`, which shows
its secret once, inside the command that connects Claude Code.

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
