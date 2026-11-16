# Binsight backend

The FastAPI application: the web API the frontend calls, the MCP server
Claude calls, and the frontend's built files, in one process.

> **Status: foundations.** Tooling is set up; no application code yet. This
> describes the intended stack.

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

Only the last three are installed so far. The rest are added by the step
that first uses them.

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
