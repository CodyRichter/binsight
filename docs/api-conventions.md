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
- Every other path returns the frontend
  ([decision 0008](decisions/0008-frontend-served-by-backend.md)).
- Paths use plural nouns in kebab-case: `/api/locations`,
  `/api/saved-searches`.
- A path's first segment is the feature that owns it. `/api/health` is the
  one exception: it belongs to `app/core/`, needs no sign-in, and is what
  the container's health check calls.

## Sign-in

- Every route needs a login session except `/api/health` and the four in
  `auth`: `get_auth_status`, `create_owner`, `sign_in` and `sign_out`. A
  request without one gets 401 `not_signed_in`.
- The session is a cookie the browser sends itself; pages never read it.
- A write (any method but `GET`) sent from another site is refused with
  403 `cross_site_request`. There is no CORS.
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
- Anything that returns an item includes its `path`, and its
  `last_checked_at` from the step that builds checks.

## Lists

- Every list endpoint is paginated: `?limit=` (default 50, at most 200) and
  `?cursor=`.
- The response is `{"items": [...], "next_cursor": "..."}`, with
  `next_cursor` set to `null` on the last page.
- Counts shown in the interface come from dedicated count fields, not from
  fetching every page.
- The location tree is the one exception: it is returned whole, because the
  tree view needs all of it and a home has a few hundred locations at most.

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
| 403    | Sent from another site.                                        |
| 404    | No such record.                                                |
| 409    | The request conflicts with the current state.                  |
| 422    | A field failed validation.                                     |
| 500    | A bug. Never returned on purpose.                              |

## Writes

- Every write response includes `history_entry_id`, which is what undo
  takes: `POST /api/history/{entry_id}/undo`. Undo is refused with 409
  `already_undone`, `changed_since` when a record no longer holds what the
  entry left it as, or `undo_not_supported` for an action undo does not
  cover yet. It covers adding items, changing an item's name or
  quantity, and moving an item or a location; undoing a location's move is
  refused with `changed_since` when its old parent has since been moved
  inside it.
- A move is refused with 409 `already_there` when the thing is already in
  that location, `move_into_itself` when a location would go into itself
  or anything inside it, and `site_cannot_move` for a site.
- A photo is uploaded as `multipart/form-data` with one `photo` part,
  JPEG, PNG or WebP, at most 20 MB; anything else is refused with 422
  `unsupported_photo` or `photo_too_large`. The photo is stored before the
  write transaction starts, and deleted again if that transaction fails.
- The actor is taken from how the request was authenticated, never from the
  request body: a session cookie is `app`, an MCP credential is `mcp`.
- Signing in and out are not changes to the home, so `auth`'s routes write
  no history entry and return no `history_entry_id`.

## MCP tools

- Named `verb_noun` in `snake_case`: `search_home`, `move_item`,
  `check_location`.
- One tool per user action, calling the same service function as its route.
- Every route has an operation name in the same `verb_noun` form, and the
  tool for that action has the same name. The parity test compares the two
  lists; the few routes Claude has no use for, such as signing in, are
  named in that test: `get_health`, `get_auth_status`, `create_owner`,
  `sign_in` and `sign_out`. The MCP credential routes,
  `create_mcp_credential`, `list_mcp_credentials` and
  `revoke_mcp_credential`, have no tool either: a credential that could make
  credentials would make revoking one meaningless.
- A client authenticates with an MCP credential sent as a bearer token
  ([decision 0010](decisions/0010-mcp-access.md)). A request to `/mcp`
  without a current one, including one with only a session cookie, gets 401
  `invalid_mcp_credential`.
- Inputs and results use the same field names and shapes as the API. A
  photo goes to a tool as base64 text, and comes back as image content.
- Errors use the same `code` values as the API.
- A tool that deletes, merges or changes many records returns a preview and
  a confirmation token first, and acts only when called again with the same
  inputs and the token. A token works once and expires after ten minutes.
  Adding several items is not one of these: it only creates, and one undo
  removes the whole batch.
- A location can be named by its code wherever a location identifier is
  accepted.
