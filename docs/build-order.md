# Build order

The order Binsight is built in. Each step is a thin slice that works end to
end before the next one starts. Breadth comes after the five core flows in
[acceptance.md](acceptance.md) pass.

## Rules for every step

- A step ships the backend service, its route, its MCP tool, its page, and
  its tests together. No step leaves one side for later.
- A step is done when `scripts/check.sh` passes and the container starts
  from an empty data directory and from the previous step's data.
- A step that needs something from the requirements' LATER or NON-GOALS
  lists stops and asks.
- One step per pull request where that is practical.

## Step 0: Foundations (this commit)

Requirements, glossary, data model, conventions, decisions, lint limits,
continuous integration, and agent rules. No application code.

## Step 1: Walking skeleton

The smallest thing that proves every layer connects.

- Backend starts, opens SQLite with the agreed settings, runs migrations.
- Owner sign-in with a long-lived session.
- Create a location, list locations as a tree.
- Add an item by name to a location; see it there with its full path.
- History entries written for each of those.
- One MCP tool: list a location's contents.
- Generated API types, checked for staleness.
- The container image builds and runs; CI runs every check.

## Step 2: Labels (flow 1)

Codes, QR images, blank labels and claiming, and the `/l/[code]` page.

## Step 3: Adding quickly (flow 2)

Quick add, batch add, photo add, "add to existing", the inbox, and undo.

## Step 4: Search (flow 3)

Global search with typo tolerance, results with paths, add from an empty
result.

## Step 5: Moving (flow 4)

Move an item, move a location, scan-to-move, and undo for both.

## Step 6: MCP parity (flow 5)

Every action so far has a tool. The parity test and the confirmation step
for destructive tools go in here. From this step on, the parity test fails
any change that adds an action without its tool.

**All five flows pass at this point. Tag `v0.1.0`.**

## Step 7 onward: breadth

In this order, each as its own step:

1. Checks: contents checked, check mode, last-checked everywhere.
2. Item details: quantity controls, status, lent to, archive, links.
3. Views and saved searches.
4. Attachments beyond photos: receipts, manuals, links.
5. Working on a bad connection: cached pages and the offline queue.
6. Import and export, the insurance export, contents sheets.
7. Scheduled backups and restore.
8. Location housekeeping: merge, delete with reassignment, reorder.
9. Bulk edit.
10. Install-to-home-screen polish and an accessibility pass.

**Everything in the requirements is built at this point. Tag `v1.0.0`.**
