# Build order

The order Binsight is built in. Each backend phase B-n is followed by its
frontend phase F-n, through the five core flows in
[acceptance.md](acceptance.md) ([decision 0014](decisions/0014-paired-phases.md)).
Breadth comes after.

## Rules for every step

- A backend phase ships its services, routes, MCP tools and tests together.
  No phase leaves the MCP side for later.
- A frontend phase builds its pages from the design language's components,
  copying its template's specimen in `frontend/src/features/design/`, then
  deletes that specimen, its route and its browser tests
  ([decision 0015](decisions/0015-specimens-end-with-their-page.md)). If a
  screen needs something the design language lacks, the phase stops and
  asks.
- A step creates the feature folders it needs. No folder exists before the
  step that fills it. A backend folder may exist without its frontend one;
  a frontend feature folder still needs its backend one.
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

## The five flows, in pairs

### B1: Foundation

The backend starts, opens SQLite with the agreed settings, runs migrations
and serves the built frontend. Sessions and transactions, the error shape,
pagination, the health route, the migration test, and generated API types
checked for staleness.

### F1: The app shell

The frame around every page, talking to the backend through React Query:
the development proxy, the query client, and the health check that shows
"Can't reach Binsight" when the home server does not answer. No pages yet;
every address shows "Nothing at this address" inside the frame.

### B2: Sign-in

Creating the owner on first visit, and sign-in with a long-lived session.
Feature: `auth`.

### F2: Sign-in

`/login` for signing in and creating the owner, and `/settings` with
"Sign out". Signed out goes to the Gate and back to the address asked for.

### B3: Locations, items and history

Create a location, list locations as a tree, add an item by name to a
location and see it with its full path. History entries written for each,
inside the action's transaction. Features: `locations`, `items`,
`history`.

### F3: Locations, items and history

The tree at `/`, a location's page with single add and "Add location", and
an item's page with its name, quantity and history.

### B4: MCP

MCP credentials, the MCP server, a tool for every action so far, and the
parity test.

### F4: MCP credentials

Creating and revoking MCP credentials in `/settings`.

### B5: Container

The container image builds and runs from an empty data directory and from
a copy of a used one.

### F5: The app in the container

No pages. The built app is checked inside the container.

### B6: Labels (flow 1)

Codes, QR images, blank labels and claiming. Feature: `labels`.

### F6: Labels

The `/l/{code}` page for a location, a blank label to claim, an unknown
code and a deleted location; code chips; "Labels" in `/settings`.

### B7: Adding quickly (flow 2)

Batch add, photo add, "add to existing", the inbox, and undo. Feature:
`attachments`, for photos only.

### F7: Adding quickly

"Add several", add by photo, "Add to existing", `/inbox`, Add in the
navigation, and undo.

### B8: Search (flow 3)

Global search with typo tolerance and results with paths. Feature:
`search`. How typo tolerance is done is decided here, with measurements,
and recorded as a decision.

### F8: Search

`/search` with the matched text marked, and adding from an empty result.

### B9: Moving (flow 4)

Move an item, move a location, and undo for both.

### F9: Moving

Moving an item or a location, `/scan` and scan-to-move (feature `scan`,
frontend only).

### B10: Confirmation (flow 5)

Deleting and restoring an item, and the preview and confirmation step for
destructive MCP tools. Every flow 5 request in
[acceptance.md](acceptance.md) passes through MCP tests.

### F10: Deleting

Deleting and restoring an item. The end-to-end tests for all five flows
pass in continuous integration.

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
