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
  the record: `POST /api/items/{id}/move`, `POST /api/items/{id}/mark-missing`.

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
- Anything that returns an item includes its `path`.

## Lists

- Every list endpoint is paginated: `?limit=` (default 50, at most 200) and
  `?cursor=`.
- The response is `{"items": [...], "next_cursor": "..."}`, with
  `next_cursor` set to `null` on the last page.
- Counts shown in the interface come from dedicated count fields, not from
  fetching every page.
- The location tree is one exception: it is returned whole, because the
  tree view needs all of it and a home has a few hundred locations at most.
  The insurance list and the contents sheet are others: each is one
  document printed whole, so it is answered whole. The backups list is the
  last: at most 14 are kept.

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
  cover yet. It covers adding items, changing an item's name, quantity,
  category, tags or details, moving an item or a location, deleting or restoring an item,
  marking an item missing or found, changing its status, lending and
  returning it, linking items and removing a link, renaming, deleting, merging, restoring and reordering a
  location, and saving, renaming, pinning, unpinning and deleting a saved
  search; undoing a removed link is refused with `changed_since` once the
  same link has been made again; undoing a location's move is refused with `changed_since` when its
  old parent has since been moved inside it, and any other change to an
  item or location that has since been deleted is refused with
  `changed_since`.
- `PATCH /api/items/{id}` changes only the fields given. A detail given as
  `null` is cleared; `name`, `quantity` and `tags` can be changed but not
  cleared, and an empty body is refused. `category` is a name, matched
  ignoring case or made; `tags` is the whole list, lower-cased, each once.
  Over MCP, `update_item` takes the same fields as one `changes` object.
  `GET /api/categories` and `GET /api/tags` list the names items have, by
  name, with how many items have each.
- `DELETE /api/items/{id}` deletes an item and `POST
  /api/items/{id}/restore` restores it. A deleted item is left out of every
  list, count and search, and `GET /api/items/{id}` still answers with it,
  its `deleted_at` set. Changing, moving or deleting it again is refused
  with 409 `item_deleted`; restoring an item that is not deleted is refused
  with 409 `not_deleted`.
- `POST /api/items/{id}/duplicate` adds a copy beside the item, as the data
  model describes, and answers 201 with it. `POST /api/items/{id}/merge`
  takes `into`, folds the item into that one and deletes it, answering with
  the item merged into; merging an item into itself is refused with 409
  `same_item`, and either being deleted with 409 `item_deleted`.
- `POST /api/items/{id}/mark-missing` is refused with 409
  `already_missing`, and `POST /api/items/{id}/mark-found`, which takes the
  `location_id` where it turned up, with 409 `not_missing`.
- `POST /api/items/{id}/status` sets `in_place`, `in_use`, `sold`,
  `given_away` or `thrown_away`. It is refused with 409 `status_unchanged`
  for the status the item already has, and `use_mark_found` for a missing
  item put back in place, since found asks where it turned up. `POST
  /api/items/{id}/lend` takes `lent_to`, a name; lending again changes the
  name. `POST /api/items/{id}/return` is refused with 409 `not_lent`.
  Lending or marking missing an archived item is refused with 409
  `item_archived`. `GET /api/items/lent-to-names` lists the names lent to
  before, most recent first.
- Bulk edit: `POST /api/items/bulk/move` (`location_id`),
  `/api/items/bulk/tag` (`tag`, added to each item's tags),
  `/api/items/bulk/category` (`category`, null to clear),
  `/api/items/bulk/status` (`status`, as for one item),
  `/api/items/bulk/lend` (`lent_to`) and `/api/items/bulk/delete` each take
  `item_ids`, 1 to 500, and answer with `items`, only those changed, and one
  `history_entry_id` that undoes the batch. An unknown or deleted item
  refuses the whole batch. Items already so are left out; when none would
  change it is refused with 409 `already_there`, `already_tagged`,
  `category_unchanged` or `status_unchanged` (for lending, every item
  already lent to that name). A missing item put back in place is refused
  with `use_mark_found`, and lending an archived item with `item_archived`.
- `POST /api/items/{id}/links` takes `other_item_id` and `kind`
  (`belongs_with`, or `part_of` when this item is the part), and is refused
  with 422 `same_item` or `part_cycle`, or 409 `already_linked`. `GET
  /api/items/{id}/links` lists the linked items with each link's `kind`
  from this item's side: `belongs_with`, `part_of`, or `part` when the
  linked item is part of this one. `DELETE /api/item-links/{id}` removes a
  link.
- `GET /api/search` takes `query` and the filters `location_id` (that
  location and everything inside it), `category` (a name, ignoring case),
  `tag`, `status` and `warranty` (`active`, `ending_soon` within 30 days,
  or `ended`). An item must match every filter given; locations are left
  out when any filter but `location_id` is given. With a filter and no
  words, every item it keeps is listed by name. An unknown location is 404.
- `GET /api/views` lists the built-in views with their counts, and `GET
  /api/views/{view}` one view's items. An unknown view is 422. Dates count from the server's day
  in UTC.
- `POST /api/saved-searches` keeps a search (`name`, `query` and the
  filters); `PATCH /api/saved-searches/{id}` changes `name` or `pinned`,
  refused with 409 `nothing_changed` when neither would change; `DELETE`
  removes it. `GET /api/saved-searches/{id}/results` runs it. Each saved
  search carries `count`, what it finds now. Over MCP,
  `delete_saved_search` goes through the confirmation step.
- `PATCH /api/locations/{id}` changes `name` or `summary`; a `summary`
  given as `null` or empty is cleared, and `name` cannot be cleared.
  `DELETE /api/locations/{id}` deletes a location, refused with 409
  `location_has_contents` while items or locations are directly in it,
  unless `?move_contents_to={id}` names where they go first. Its items
  that are not deleted, archived ones included, move with it; archived
  items left in a deleted empty location keep it as their home. `POST
  /api/locations/{id}/merge` takes `into` and moves the location's items,
  and the locations inside it there, and its label too when
  `into` has none, then deletes it; it answers with the location merged
  into. Either refuses a destination that is the location or inside it
  with 409 `move_into_itself`. `POST /api/locations/{id}/restore` brings a
  deleted location back, empty, refused with 409 `not_deleted`, or
  `parent_deleted` when the location it sat in is deleted too. `POST
  /api/locations/{id}/reorder` takes `position`, its place among its
  siblings from 0 (past the end means last), refused with 409
  `already_there` when nothing would move. A deleted location is left out
  of the tree, search and views; `GET /api/locations/{id}` still answers
  with it, its `deleted_at` set, and its label still names it. Changing a
  deleted location, or putting anything in it, is refused with 409
  `location_deleted`. Over MCP, `delete_location` and `merge_location` go
  through the confirmation step.
- A move is refused with 409 `already_there` when the thing is already in
  that location, `move_into_itself` when a location would go into itself
  or anything inside it, and `site_cannot_move` for a site.
- A photo is uploaded as `multipart/form-data` with one `photo` part,
  JPEG, PNG or WebP, at most 20 MB; anything else is refused with 422
  `unsupported_photo` or `photo_too_large`. The photo is stored before the
  write transaction starts, and deleted again if that transaction fails.
- A file is uploaded the same way with one `file` part: a PDF, JPEG, PNG
  or WebP, judged by its bytes rather than its name, at most 50 MB, or
  422 `unsupported_file` or `file_too_large`. An item's attachments are
  under `/api/items/{id}`: `GET attachments`, `POST photos`, `POST files`,
  `POST web-links` (`url`, an http(s) address, and an optional `name`) and
  `DELETE attachments/{attachment_id}`, which refuses an unnamed item's
  only photo with 409 `photo_names_item`. A location's one photo is
  `POST` or `DELETE /api/locations/{id}/photo`, a new one replacing the
  old. `GET /api/attachments/{id}/file` serves a photo or file inline
  with its own type and filename; a web link has no file, so it is 404
  `attachment_not_found`.
- `GET /api/export` answers with a zip, `binsight-export-{date}.zip`:
  `binsight.json` (a `format_version`, now 1, and every stored row of the
  home's tables, history included), `items.csv` in the import's columns
  (leaving out items never named, which only `binsight.json` holds, since
  the import would refuse them), `locations.csv`, and every photo and file at its stored path. It is
  written from one read session to a temporary file and deleted once sent.
- `POST /api/import` takes one `csv` part, UTF-8 text with a header row, at
  most 5 MB (else 422 `unsupported_file` or `file_too_large`). The columns,
  in any order, are `name` (the only one required), `quantity`, `location`,
  `category`, `tags` (separated by `;`), `notes`, `brand`, `model`,
  `serial_number`, `purchase_date`, `price` (such as `12.50`),
  `order_link`, `warranty_ends`, `return_ends`, `status` and `lent_to`;
  any other column refuses the file. `location` is a path such as
  `Garage > Shelf 3 > Bin 7`: each step matches by name under the one
  before, ignoring case, or by a claimed label code; missing steps are made,
  a new top level as a site and the rest as bins; an empty one is the
  inbox. Every row is checked before anything is written, and any problem
  refuses the whole file with 422 `import_rows_invalid`, whose
  `details.rows` lists up to 50 `{row, column, message}`, counting the
  header as row 1. One history entry, `items.imported`, holds every item
  and location made, so one undo takes the import back.
- `GET /api/insurance-list` (optionally `?location_id=`, which takes in
  everything inside it) answers with every item still owned: not deleted,
  sold, given away or thrown away. Items come by path, then name, each with
  its details, `photo_urls` (every photo) and `receipts` (every file by
  name and every web link). `total_cents` adds each price times its
  quantity; `items_without_price` counts the rest.
- `GET /api/contents-sheet/{location_id}` answers with the location and
  `groups`: the location itself, then every location inside it, parents
  first, each with its path, label code and the items still owned kept
  directly in it.
- `GET /api/backups` answers with `backups`, newest first, each with its
  `name` (its folder in `backups/`), `taken_at` and `size` in bytes.
  `POST /api/backups` takes one now and answers 201 with it. Neither is a
  change to the home, so neither writes history; restoring is done on the
  server, as `deploy/README.md` describes, and has no route.
- The actor is taken from how the request was authenticated, never from the
  request body: a session cookie is `app`, an MCP credential is `mcp`.
- Signing in and out are not changes to the home, so `auth`'s routes write
  no history entry and return no `history_entry_id`.

## MCP tools

- Named `verb_noun` in `snake_case`: `search_home`, `move_item`,
  `mark_item_missing`.
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
  photo or file goes to a tool as base64 text; a photo or image comes back
  as image content, a PDF as an embedded `application/pdf` resource, and
  the export as an embedded `application/zip` resource.
- Errors use the same `code` values as the API.
- A tool that deletes, merges or changes many records returns a preview and
  a confirmation token first, and acts only when called again with the same
  inputs and the token. A token works once and expires after ten minutes;
  otherwise the call is refused with 409 `confirmation_invalid` or
  `confirmation_expired`. `delete_item` is one of these, as are
  `delete_location`, `merge_location` and `merge_item`, and the bulk edits,
  `move_items`, `tag_items`, `change_items_category`,
  `change_items_status`, `lend_items` and `delete_items`; the app has no
  confirmation step, since its delete offers Undo. So are
  `remove_item_attachment` and `remove_location_photo`, and `import_items`,
  whose token is tied to the CSV text's hash.
  Adding several items is not one of these: it only creates, and one undo
  removes the whole batch.
- A location can be named by its code wherever a location identifier is
  accepted.
