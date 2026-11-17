# Build order

The order Binsight is built in. The backend is built first, through the
five core flows in [acceptance.md](acceptance.md), then the frontend is
wired to it ([decision 0013](decisions/0013-backend-first.md)). Breadth
comes after both.

## Rules for every step

- A backend phase ships its services, routes, MCP tools and tests together.
  No phase leaves the MCP side for later.
- A step creates the feature folders it needs. No folder exists before the
  step that fills it. Before the wiring stage, a backend folder may exist
  without its frontend one.
- A step is done when `scripts/check.sh` passes and, from B5 on, the
  container starts from an empty data directory and from the previous
  step's data.
- A step that needs something from the requirements' LATER or NON-GOALS
  lists stops and asks.
- One step per pull request where that is practical.

## Step 0: Foundations

Requirements, glossary, data model, conventions, decisions, lint limits,
continuous integration, and agent rules. The frontend toolchain (Vite,
React, Mantine) and the design language as a theme, lint rules and
components, rendered at `/design` in development. No application behavior.

## Backend

### B1: Foundation

The backend starts, opens SQLite with the agreed settings, runs migrations
and serves the built frontend. Sessions and transactions, the error shape,
pagination, the health route, the migration test, and generated API types
checked for staleness.

### B2: Sign-in

Creating the owner on first visit, and sign-in with a long-lived session.
Feature: `auth`.

### B3: Locations, items and history

Create a location, list locations as a tree, add an item by name to a
location and see it with its full path. History entries written for each,
inside the action's transaction. Features: `locations`, `items`,
`history`.

### B4: MCP

MCP credentials, the MCP server, a tool for every action so far, and the
parity test.

### B5: Container

The container image builds and runs from an empty data directory and from
a copy of a used one.

### B6: Labels (flow 1)

Codes, QR images, blank labels and claiming. Feature: `labels`.

### B7: Adding quickly (flow 2)

Batch add, photo add, "add to existing", the inbox, and undo. Feature:
`attachments`, for photos only.

### B8: Search (flow 3)

Global search with typo tolerance and results with paths. Feature:
`search`. How typo tolerance is done is decided here, with measurements,
and recorded as a decision.

### B9: Moving (flow 4)

Move an item, move a location, and undo for both.

### B10: Confirmation (flow 5)

Deleting and restoring an item, and the preview and confirmation step for
destructive MCP tools. Every flow 5 request in
[acceptance.md](acceptance.md) passes through MCP tests.

## Wiring the frontend

Every page for the five flows, built on the generated API types: sign-in,
the tree, locations, items, the `/l/{code}` page, quick and batch add,
the inbox, search, scan-to-move (feature `scan`, frontend only) and undo.
The end-to-end tests for the five flows join continuous integration.

**All five flows pass at this point. Tag `v0.1.0`.**

## Breadth

In this order, each as its own step shipping both sides together:

1. Checks: contents checked, check mode, last-checked everywhere.
   Feature: `checks`.
2. Item details: quantity controls, status, lent to, archive, links,
   categories and tags.
3. Views and saved searches. Feature: `views`.
4. Attachments beyond photos: receipts, manuals, links.
5. Import and export, the insurance export, contents sheets. Feature:
   `import_export`.
6. Scheduled backups and restore. Feature: `backups`.
7. Location housekeeping: merge, delete with reassignment, reorder.
8. Bulk edit.
9. Install-to-home-screen polish and an accessibility pass.

**Everything in the requirements is built at this point. Tag `v1.0.0`.**
