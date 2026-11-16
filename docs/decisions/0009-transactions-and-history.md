# 0009: One transaction per action, with history recorded inside it

Status: Accepted

## Context

Every change must be recorded in history in the same transaction, features
call each other's service functions, and undo has to work for every feature
without each one writing its own. Left undecided, the first feature would
settle who opens a transaction and how undo reaches other features.

## Decision

Transactions:

- A route or MCP tool gets its database session from one place in
  `app/core/`. That place opens the transaction, commits when the service
  function returns, and rolls back when it raises.
- Service functions take the session as their first argument. They never
  open, commit or roll back.
- One user action is one transaction, however many service functions and
  features it passes through.

History:

- A history entry has one row per record it changed, each holding that
  record's changed fields before and after. A bulk move is one entry with
  many changes.
- Features call `history` to record. `history` never calls another feature.
- A write transaction that changes an item, location or label and commits
  without a history entry raises an error.

Undo:

- Undo belongs to `history`. It writes each change's "before" values back
  to the record directly. This is the one place a feature writes another
  feature's tables.
- Undo is refused when any field it would restore no longer holds the
  entry's "after" value, or when it would point a record at a deleted
  location.
- Undoing a create deletes the record. An undo is itself a history entry.

## Why

- A service function can call another without either knowing whether a
  transaction is already open.
- The dependency runs one way, so `history` and the features it serves do
  not import each other in a circle.
- Refusing a stale undo is easier to trust than merging one.

## Cost

- Service functions cannot be called without a session, including in tests.
- `history` must know how to write any record's fields, so a new kind of
  record has to be made known to it.
- An action changed again since cannot be undone; the owner reverses it by
  hand.
