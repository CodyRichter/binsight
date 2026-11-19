# 0020: Location contents are not checked

Status: Accepted

## Context

1.0 shipped the requirements' KEEPING IT TRUE checks: a "Contents checked"
button as the first action on every location page, check mode in More, a
"Checked …" stamp under every location's title and on stale search and view
rows, a "Not checked in a long time" view, and `last_checked_at` on every
item and location in the API and MCP. Using the app showed that nobody
confirms a bin's contents unprompted: it is a chore with no payoff at the
moment of use. With no checks recorded, every row said "Never checked",
which was noise rather than honesty, and the button took the page's main
place from Move.

## Decision

- Checks are removed: the button, check mode, the stamp, the view, the
  `check` table, `POST /api/locations/{id}/check`, `check_location` and
  `last_checked_at`.
- Migration 0015 drops the stored checks. History entries of checks keep
  their item changes, so items a check marked missing still show "Marked
  missing in a check" and can be undone.
- Confirming contents goes under NON-GOALS. Marking an item missing and
  found stays: it is one tap at the moment something is not there.

## Why

- The requirements' own rule: a feature must make finding or updating
  faster, or it goes to NON-GOALS. A check does neither.
- A location page's one primary action is now Move, the thing people do.
- Less to keep in step: a feature folder on each side, a table, a route, a
  tool, and a field on every answer.

## Cost

- The app no longer shows how fresh a location's contents are. Old records
  look the same as new ones.
- Stored check dates are gone from the database and the export. Backups
  taken before 0015 still have them.
