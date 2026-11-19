# 0018: Deleting and merging locations are run from the locations folder, outside its service

Status: Accepted

## Context

Deleting a location moves its items and the locations inside it, and
merging also moves its checks and its label. Those records belong to
`items`, `checks` and `labels`, and each of those features already builds
on `locations` through its service: an item's path, a check's location, a
label's location. If `locations/service.py` called them back, the import
graph would have a cycle, and [decision 0003](0003-feature-folders.md)
says the feature whose data changes owns the action without saying which
one when four features change.

## Decision

- Each feature moves its own records, through one public function in its
  `service.py` that changes the rows and returns the history changes for
  the caller to record: `items.rehome_items`, `checks.move_checks`,
  `labels.move_label`, and `locations.move_children` and
  `locations.mark_deleted`.
- `features/locations/housekeeping.py` runs deleting and merging: it calls
  those functions and records one history entry, so one Undo reverses it.
- The locations routes and the MCP tools call `housekeeping.py` directly.
  It is the one file outside a `service.py` that other code calls, and
  `locations/service.py` never imports it, so nothing cycles.

## Why

- No feature reads or writes another's tables, so 0003 holds.
- The action lives with the record it is about, the location, next to the
  rest of the location's behavior.

## Cost

- One exception to "`service.py` is the only file other code calls", which
  a reader has to know about. The comment at the top of
  `housekeeping.py` points here.
