# AGENTS.md (backend)

Adds to the [root AGENTS.md](../AGENTS.md), which applies here in full.
Stack and layout are in [README.md](README.md).

## Check your work

Run `../scripts/check.sh`. For a faster loop while working, from the
repository root:

```
uv run --project backend ruff check .
(cd backend && uv run pytest)
```

Lint rules are in `../ruff.toml`. Dependencies are added with `uv add`, so
`uv.lock` stays in step.

## Where code goes

- A feature's behavior lives in its `service.py`. Nowhere else.
- `routes.py` and the MCP tools in `app/mcp/` do three things: validate
  input, call one service function, shape the result. If either needs an
  `if` about business rules, that rule belongs in the service.
- A feature calls another feature only through its service functions. It
  never queries another feature's tables directly.
- Tables are defined only in `app/models/`.
- SQLite settings (write-ahead-log mode, busy timeout, foreign keys, taking
  the write lock up front) are set once in `app/core/`. No feature opens its
  own connection or changes them.

## Rules that come from the requirements

- Only a name is ever required, and a photo can stand in for it until the
  item is named. Every other field is optional in schemas and nullable in
  the database.
- Every change is recorded through the `history` feature with who made it:
  the app or MCP. Undo and item history depend on it, so a write that skips
  it is a bug even if it works.
- Every user action has an MCP tool calling the same service function as its
  route.
- MCP tools that delete, merge or touch many items at once go through the
  confirmation step.
- Anything returning an item includes its full location path and when its
  bin was last checked.
- Items are archived, never removed. Deleted items stay restorable.
- A label code is never reused, even after its location is deleted.
- The `/l/{code}` address format never changes. It is printed on labels.
- Photos and files are stored on disk in the data directory. The database
  holds paths.

## Python

- Route handlers are plain `def`, not `async def`. SQLAlchemy calls block,
  and FastAPI runs `def` handlers in a thread pool.
- Every function has type hints on its arguments and return value.
- Queries use SQLAlchemy or bound parameters. Never build SQL from strings.
- One write transaction per service call. Do not hold a transaction open
  across a network call or file upload.
- List endpoints are paginated from the start.

## Migrations

- Every change in `app/models/` comes with an Alembic migration in the same
  commit, written with batch mode because SQLite cannot alter columns.
- Never edit a migration that has been merged. Add a new one.
- A migration must not lose data. If it has to transform rows, test it
  against a database that has rows.

## Do not

- Add Postgres support, or a layer for swapping databases.
- Run more than one backend process, or move the MCP server into its own.
- Add background workers, queues or caches. One process and SQLite are fast
  enough at this scale.
