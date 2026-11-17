# 0015: A template's specimen is deleted when its real page lands

Status: Accepted. Amends one bullet of [0014](0014-paired-phases.md).

## Context

Decision 0014 has each page copy its template's specimen in
`frontend/src/features/design/`. Kept after the copy, a specimen is a second
version of the page, built on its own sample data, that drifts from the real
one and is still tested and maintained.

## Decision

- The frontend phase that builds a template's first real page deletes that
  template's specimen, its `/design/{template}` route and the browser tests
  aimed at it, in the same change.
- A check in those tests worth keeping moves to the real page's tests.
- `/design` stays: it is the catalogue of tokens and components, and the
  specimens of templates with no real page yet.

## Why

- The real page becomes the one place the template is shown and tested.
- What `features/design` holds shrinks as the app grows, instead of
  growing with it.

## Cost

- Once its specimen is gone, a template can only be seen on its real page,
  with real data.
