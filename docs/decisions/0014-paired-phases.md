# 0014: Each backend phase is followed by its frontend phase

Status: Accepted. Replaces [0013](0013-backend-first.md); amended by
[0015](0015-specimens-end-with-their-page.md).

## Context

Decision 0013 built the backend through all five flows before any page was
wired. With the design language finished as working components and the
backend foundation (B1) running, waiting until B10 to use the app in a
browser hides mistakes that only a page shows, and leaves every page to be
built at once.

## Decision

- Each backend phase B-n is followed by its frontend phase F-n, which
  builds the pages for what B-n made reachable.
- Within a pair the API lands first: B-n ships its services, routes, MCP
  tools and tests, and F-n builds on its generated types.
- A page copies its template's specimen in `frontend/src/features/design/`.
  F phases add no components, tokens or templates; a need the design
  language does not meet stops and asks.
- Each flow's end-to-end test starts in the F phase that builds its page.
- A backend feature folder may exist before its frontend folder. A
  frontend feature folder still needs its backend one.
- Breadth after `v0.1.0` stays one step per feature, both sides together.

## Why

- Each phase is usable in a browser when it lands, so a mistake in the API
  shape is found while that phase is still fresh.
- Pages are still written against a settled API, because the B phase of a
  pair is merged before its F phase starts.

## Cost

- A later B phase may change an API an earlier page uses, and that page
  changes with it.
- Twice as many pull requests before `v0.1.0`.
