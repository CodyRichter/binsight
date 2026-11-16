# API conventions

Rules every endpoint and MCP tool follows, decided once so the first
endpoint does not set them by accident. Terms are from the
[glossary](glossary.md).

## One contract, generated

- The backend's OpenAPI description is the contract. It is produced from the
  FastAPI routes and Pydantic schemas, never written by hand.
- The frontend's types are generated from it into
  `frontend/src/types/api.generated.ts`. That file is never edited by hand.
- `scripts/check.sh` regenerates the types and fails if the result differs
  from what is committed.
- Hand-written types in `frontend/src/types/` are for things the backend
  does not know about, such as interface state.

## Addresses

- Everything is under `/api`. There is no version in the path: the frontend
  and backend ship together in one image.
- The MCP server is at `/mcp`.
- Paths use plural nouns in kebab-case: `/api/locations`,
  `/api/saved-searches`.
- A path's first segment is the feature that owns it.
- No trailing slashes, and the frontend never adds one.
- Actions that are not plain create, read, update or delete are a verb under
  the record: `POST /api/items/{id}/move`, `POST /api/locations/{id}/check`.

## Methods

| Method   | Use                                                           |
| -------- | ------------------------------------------------------------- |
| `GET`    | Read. Never changes anything.                                 |
| `POST`   | Create, or perform a named action.                            |
| `PATCH`  | Change some fields. A field left out is unchanged; a field set to `null` is cleared. |
| `DELETE` | Delete. The record can be restored.                           |

There is no `PUT`.

## Data shapes

- JSON, with field names in `snake_case` on both sides.
- Identifiers are opaque strings. Clients never build, parse or sort them.
- Times are UTC in ISO 8601 with a `Z`, e.g. `2026-11-15T21:52:00Z`.
- Dates with no time are `YYYY-MM-DD`.
- Money is a whole number of the currency's smallest unit, in a field ending
  `_cents`. An install has one currency.
- A missing optional value is `null`, never an empty string or a missing
  key.
- Anything that returns an item includes its `path` and its
  `last_checked_at`.

## Lists

- Every list endpoint is paginated: `?limit=` (default 50, at most 200) and
  `?cursor=`.
- The response is `{"items": [...], "next_cursor": "..."}`, with
  `next_cursor` set to `null` on the last page.
- Counts shown in the interface come from dedicated count fields, not from
  fetching every page.

## Errors

One shape for every error:

```json
{
  "error": {
    "code": "location_has_contents",
    "message": "Move or reassign this location's contents before deleting it.",
    "details": {}
  }
}
```

- `code` is a stable `snake_case` string that the frontend and Claude act
  on. Changing one is a breaking change.
- `message` is a full sentence fit to show to the owner.
- `details` holds anything specific to the code, such as which field failed.

| Status | Meaning                                                        |
| ------ | -------------------------------------------------------------- |
| 400    | The request makes no sense as sent.                            |
| 401    | Not signed in, or the credential is invalid or revoked.        |
| 404    | No such record.                                                |
| 409    | The request conflicts with the current state.                  |
| 422    | A field failed validation.                                     |
| 500    | A bug. Never returned on purpose.                              |

## Writes

- Every write request carries an `Idempotency-Key` header holding a random
  value made by the client. Sending the same key again returns the first
  result and changes nothing. The offline queue depends on this.
- Every write response includes `history_entry_id`, which is what undo
  takes.
- Changes queued offline are applied in the order they were made. If the
  record changed in the meantime, the later write wins and both appear in
  history.
- The actor is taken from how the request was authenticated, never from the
  request body.

## MCP tools

- Named `verb_noun` in `snake_case`: `search_items`, `move_item`,
  `check_location`.
- One tool per user action, calling the same service function as its route.
- Inputs and results use the same field names and shapes as the API.
- Errors use the same `code` values as the API.
- A tool that deletes, merges or changes many records returns a preview and
  a confirmation token first, and acts only when called again with the
  token.
- A location can be named by its code wherever a location identifier is
  accepted.
