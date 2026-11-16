# Build order

The order Binsight is built in. Each step is a thin slice that works end to
end before the next one starts. Breadth comes after the five core flows in
[acceptance.md](acceptance.md) pass.

## Rules for every step

- A step ships the backend service, its route, its MCP tool, its page, and
  its tests together. No step leaves one side for later.
- A step creates the feature folders it needs, on both sides. No folder
  exists before the step that fills it.
- A step is done when `scripts/check.sh` passes and the container starts
  from an empty data directory and from the previous step's data.
- A step that needs something from the requirements' LATER or NON-GOALS
  lists stops and asks.
- One step per pull request where that is practical.

## Step 0: Foundations (this commit)

Requirements, glossary, data model, conventions, decisions, lint limits,
continuous integration, and agent rules. No application code.

## Step 1: Walking skeleton

The smallest thing that proves every layer connects. Features: `auth`,
`locations`, `items`, `history`.

- Backend starts, opens SQLite with the agreed settings, runs migrations,
  and serves the built frontend.
- Creating the owner on first visit, and sign-in with a long-lived session.
- Create a location, list locations as a tree.
- Add an item by name to a location; see it there with its full path.
- History entries written for each of those, inside the action's
  transaction.
- An MCP tool for each of those actions, an MCP credential to call them
  with, and the parity test.
- Generated API types, checked for staleness.
- Type checks and the production build for the frontend join
  `scripts/check.sh`. The end-to-end tests join continuous integration.
- The container image builds and runs.

## Step 2: Labels (flow 1)

Codes, QR images, blank labels and claiming, and the `/l/{code}` page.
Feature: `labels`.

## Step 3: Adding quickly (flow 2)

Quick add, batch add, photo add, "add to existing", the inbox, and undo.
Feature: `attachments`, for photos only.

## Step 4: Search (flow 3)

Global search with typo tolerance, results with paths, add from an empty
result. Feature: `search`. How typo tolerance is done is decided here,
with measurements, and recorded as a decision.

## Step 5: Moving (flow 4)

Move an item, move a location, scan-to-move, and undo for both. Feature:
`scan`, frontend only.

## Step 6: Confirmation (flow 5)

Deleting an item, and the preview and confirmation step for destructive
MCP tools. The flow 5 requests in [acceptance.md](acceptance.md) all pass.

**All five flows pass at this point. Tag `v0.1.0`.**

## Step 7 onward: breadth

In this order, each as its own step:

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
