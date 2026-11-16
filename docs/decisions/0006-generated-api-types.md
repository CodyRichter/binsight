# 0006: Frontend types are generated from the backend

Status: Accepted

## Context

The frontend and backend are written in different languages and must agree
on every request and response. Hand-written copies of those shapes drift
apart, and the drift shows up as bugs at runtime.

## Decision

The backend's OpenAPI description is the single contract. Frontend types are
generated from it into one file that is committed and never edited by hand.
The check script regenerates it and fails if the committed copy is stale.

## Why

- A backend change that breaks the frontend fails the type check instead of
  failing in someone's hand at a shelf.
- There is one place to look to learn what an endpoint returns.

## Cost

- Field names are `snake_case` in the frontend too, matching the backend.
- Changing a schema means regenerating and committing the types in the same
  change.
- A generation step is added to the toolchain.
