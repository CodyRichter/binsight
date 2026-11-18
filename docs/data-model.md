# Data model

What Binsight stores and the rules that always hold. Terms are defined in the
[glossary](glossary.md). This is the shape of the data, not a database
schema; column types and indexes are decided when each table is built.

## Overview

```
Location ──parent──> Location          (a tree; sites have no parent)
Location <──0..1── Label               (a label is blank until claimed)
Location <──many── Check
Item ──home location──> Location       (optional; none means inbox)
Item ──0..1──> Category
Item <──many──> Tag
Item <──Link──> Item
Attachment ──> Item or Location
HistoryEntry ──> any of the above
```

## Shared rules

- Every record has an identifier that is a random opaque string. Identifiers
  are never sequential, never shown to the owner, and never reused.
- Every record has `created_at` and `updated_at`, stored in UTC.
- Items and locations are never physically removed. Deleting sets
  `deleted_at`; restoring clears it.
- Every create, update, move, delete and restore writes a history entry in
  the same transaction.

## Location

| Field        | Notes                                                       |
| ------------ | ----------------------------------------------------------- |
| `name`       | Required.                                                   |
| `type`       | One of the fixed location types. Required.                  |
| `parent`     | Another location, or none for a site.                       |
| `summary`    | Optional one line.                                          |
| `position`   | Order among its siblings.                                   |
| `deleted_at` | Set when deleted.                                           |

Rules:

- A location with no parent has type `site`, and only sites have no parent.
- The tree has no cycles: a location cannot be moved into itself or anything
  beneath it.
- Moving a location changes only its `parent`. Everything beneath it moves
  with it and nothing beneath it is rewritten.
- Sibling names need not be unique. Paths are for people; identity is the
  identifier.
- Deleting a location requires choosing where its items and child locations
  go. A location is never deleted with contents still in it.
- Merging location A into B moves A's items, children and checks to B, then
  deletes A. A's label, if any, is re-pointed to B only if B has none.

## Label

| Field        | Notes                                                       |
| ------------ | ----------------------------------------------------------- |
| `code`       | The readable code. Unique forever.                          |
| `location`   | The location it is attached to, or none while blank.        |
| `claimed_at` | When it was attached.                                       |

Rules:

- Codes come from one series: the letter `B`, a hyphen, and a number that
  only ever increases, padded to at least three digits (`B-001`, `B-014`,
  `B-1203`). The letter does not stand for a location type, because blank
  labels are printed before their type is known.
- A code is never reused, including after its location is deleted.
- A location has at most one label, and a label is on at most one location.
- A label is never deleted. If its location is deleted, the label stays
  attached to the deleted location, and scanning it says so and offers to
  restore.
- Codes are matched without regard to letter case or the hyphen, so typing
  `b14` into search finds `B-014`.
- The code's number is stored beside it, so the series continues from the
  highest number and a typed code is matched by number.

## Item

| Field               | Notes                                                |
| ------------------- | ---------------------------------------------------- |
| `name`              | See the rule below.                                  |
| `quantity`          | Whole number, 1 by default, never negative.          |
| `home_location`     | A location, or none.                                 |
| `status`            | `in_place` by default.                               |
| `lent_to`           | A name. Present only when status is `lent_out`.      |
| `lent_at`           | When `lent_to` was set.                              |
| `category`          | At most one.                                         |
| `notes`             | Free text.                                           |
| `brand`, `model`, `serial_number` | Optional.                              |
| `purchase_date`, `price_cents`, `order_link` | Optional. Price is in the install's one currency; the link is http(s). |
| `warranty_ends`, `return_ends` | Optional dates.                           |
| `retired_at`        | When status became sold, given away or thrown away.  |
| `deleted_at`        | Set when deleted.                                    |

Rules:

- An item needs a name, or at least one photo standing in for the name until
  it is given one. Nothing else is ever required.
- An item is in the **inbox** when it has no name or no home location.
- An item is in the **archive** when its status is `sold`, `given_away` or
  `thrown_away`. Archived items keep their last home location for the record
  but do not count toward that location's contents.
- Setting `lent_to` sets status to `lent_out`. Clearing it sets status back
  to `in_place`. The two never disagree.
- Changing status never clears `home_location`.
- Marking a `missing` item found asks for its home location, which may be
  the same one.
- Individually tracked things (a drill with a serial number) are items with
  quantity 1. There is no separate kind of item.

## Category and tag

- A category has a unique name, ignoring case. Setting an item's category
  by a new name makes it. Only categories that an item has are listed, so
  one nothing uses any more is not offered. Deleting one leaves its items
  with no category.
- A tag is just its name, lower-cased, stored as a row joining it to the
  item, with no identifier of its own. A tag exists while at least one item
  has it.

## Link

- Joins two different items with a kind: `belongs_with` (either direction
  means the same) or `part_of` (the first is part of the second).
- The same pair has at most one link of each kind.
- Deleting or archiving an item leaves its links in place.

## Attachment

| Field      | Notes                                                         |
| ---------- | ------------------------------------------------------------- |
| `owner`    | Exactly one item or one location.                             |
| `kind`     | `photo`, `file` or `link`.                                    |
| `path`     | For photos and files: where it sits in the data directory.    |
| `url`      | For links.                                                    |
| `filename` | The original name, for display.                               |
| `position` | Order among the owner's attachments. The first photo is the picture shown. |

- File bytes live on disk in the data directory, never in the database.
- A photo is stored as JPEG under `attachments/`, turned upright from its
  orientation tag, at most 2048 pixels on its longest edge, and without its
  metadata, so it never carries where it was taken.
- Locations take photos only.

## Check

| Field        | Notes                              |
| ------------ | ---------------------------------- |
| `location`   | The location that was checked.     |
| `checked_at` | When.                              |
| `actor`      | Who.                               |

- A check covers the items directly in that location. It says nothing about
  locations beneath it.
- A location's **last checked** is its most recent check.
- An item's last checked is its home location's last checked.
- Adding, removing or moving items does not count as a check.

## History entry

| Field       | Notes                                                        |
| ----------- | ------------------------------------------------------------ |
| `at`        | When.                                                        |
| `actor`     | `app` or `mcp`.                                              |
| `action`    | What happened, e.g. `item.moved`, `location.merged`.         |
| `changes`   | One per record changed: the record, and its changed fields' values before and after. |
| `undone_by` | The history entry that reversed this one, if any.            |

- History is append-only. Undo adds a new entry; it never edits or removes
  an old one.
- One user action is one history entry, even when it touches many records
  (a bulk move), so it can be undone in one step.
- When undo is allowed and when it is refused is in
  [decision 0009](decisions/0009-transactions-and-history.md).

## Saved search

- A name, the search text and filters, and whether it is pinned.

## Owner and access

- One owner record, with a password hash. It is created on the first visit
  to a new install, by choosing a password.
- A login session is a random secret held in a cookie and stored as a hash.
  Nothing is signed, so an install has no session secret to configure.
- An MCP credential has a required name, such as "Claude Desktop", so it
  can be told apart when revoking it. Its secret is stored as a hash with a
  created time and a revoked time, and is shown once, when created.

## Confirmation

- Stored when an MCP tool returns a preview: the tool, its exact inputs, a
  token stored as a hash, and when it expires (ten minutes after it is
  made).
- A confirmation is used once, and only for the same tool with the same
  inputs.
