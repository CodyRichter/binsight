# 0011: The interface follows one design language

Status: Accepted

## Context

The frontend uses Mantine. Left to its defaults, and to whoever writes each
page, it would look like every other Mantine app, and each page would pick
its own sizes, colors and amount of explanatory text. Most pages will be
written by agents, which drift toward the same generic look and toward
over-explaining.

## Decision

- [docs/design-language.md](../design-language.md) defines how the
  interface looks, reads and is laid out: its tokens, text rules, frame,
  page templates and components.
- The Mantine theme in `frontend/src/lib/theme/` implements the tokens. Feature code uses theme
  keys and never a raw color, size or radius.
- Every page is one of the document's templates, and every piece of
  interface is one of its components. Something new is added to the
  document before it is built.
- Rules with no exceptions are enforced by lint
  ([decision 0007](0007-enforce-with-tools.md)).

## Why

- A page becomes a choice among known parts, not a new design, which keeps
  it fast to build and the app consistent.
- The look comes from the app's own world (totes, labels, shelving), and
  from being read one-handed at a shelf, so it has reasons that outlast
  taste.
- Text rules keep the screen to the owner's data and its controls, which is
  what makes updating quick.

## Cost

- Mantine components the design has no place for are off limits, even
  where one would be convenient.
- A new kind of component or page needs a change to the document first.
- The token values exist in the document and in the theme, and must be
  changed together. `scripts/check_repo.py` fails when the color or type
  tables differ.
