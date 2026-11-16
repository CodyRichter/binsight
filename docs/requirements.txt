BINSIGHT - REQUIREMENTS
=======================

Binsight is a self-hosted home inventory tracker built for one household.
It answers two questions: "do we own one?" and "where is it?"
This document covers what the app must do and have, not how to build it.


SCOPE
-----
- Tracks durable household things and where they are stored: tools, cables,
  electronics, documents, seasonal gear, spare parts, keepsakes.
- Also tracks non-food consumables (batteries, bulbs, filters, ink) as items
  with a count. Showing the count is supported; managing stock is not (see
  NON-GOALS).
- Food is not tracked. Grocy does that.
- One household, one main user to start. See ACCESS.
- Open source on GitHub under AGPL-3.0, but designed for this household
  first. Features are not added just because other people might want them.


PRINCIPLES
----------
- Only a name is required. Every other field is optional and can be filled in
  later, and the app never nags for it.
- Phone first. Most use happens standing at a shelf holding a bin.
- Two taps for common actions: find, add, move, update.
- Updating must be cheaper than not updating. If recording a change takes
  longer than making it, the data goes stale.
- Rough and right beats detailed and wrong. A bin with one photo and a
  one-line summary is a valid, complete record.
- The app is honest about what it knows: it shows when a bin was last
  checked rather than pretending everything is current.
- Every item shows where it lives as a full path, e.g.
  Garage > Shelf 2 > Bin B-014.
- You own the data: self-hosted, full export, nothing hidden in proprietary
  formats.
- When in doubt, leave it out. A new feature must make finding or updating
  faster, or it goes to NON-GOALS.


WHAT THE FIRST VERSION MUST NAIL
--------------------------------
Everything else in this document is secondary to these five flows:
1. Scan a bin label -> see what's in it.
2. Scan a bin label -> add things to it by name or photo.
3. Search for a thing -> see its full location path.
4. Move a thing or a whole bin -> done in two taps or two scans.
5. Ask Claude any of the above through MCP.


PLACES
------
- Nested locations as deep as you need: Home > Room > Furniture/Zone > Shelf >
  Bin > Sub-bin.
- More than one top-level place: the home, a storage unit, a car, a relative's
  house.
- Location types (site, room, furniture, shelf, bin, drawer, box) with matching
  icons. A fixed built-in list, not user-defined.
- Drill-down pages for each location showing what's directly in it, what's in
  its children, and item counts.
- Tree view of the whole home with counts. Collapse or expand any branch.
- Moving a location moves everything inside it, e.g. moving a bin to another
  shelf.
- Optional photo per location, so "Shelf 2" is easy to recognize.
- Optional one-line contents summary per location ("spare network cables"),
  searchable, for bins not worth itemizing.
- Rename, merge or delete locations. Deleting asks where the contents
  should go.
- A location is not an item. If a container is itself worth tracking (an
  expensive toolbox), add it as an item too.


LABELS AND QR CODES
-------------------
- Any location can have a label. Bins are the common case, but drawers,
  shelves and boxes work the same way.
- A short, readable code on every label (e.g. B-014) printed with its QR
  code, so it can be read without scanning and typed into search.
- Codes are permanent and never reused, even after a bin is deleted.
- The app's address is set once per install and treated as permanent. QR
  codes point at that address, so they are specific to each install.
- Scanning with the normal phone camera opens the location's page directly.
  No app install.
- Each label is downloadable as an image (QR code plus the readable code),
  to print on any ordinary printer. The app does no print layout itself.
- Generate a batch of blank labels ahead of time, stick them on bins, and
  claim each one the first time you scan it.
- The page after a scan shows contents, quick add, quick remove, "move this
  bin" and "contents checked" (see KEEPING IT TRUE).
- Scan-to-move from inside the app: pick an item or scan a bin, then scan
  the destination.
- Download a label's image again at any time to replace a damaged one. The
  code does not change.
- Items do not get their own labels. Items are found by search or by
  opening their bin.


ITEMS
-----
- Core fields: name, photos, location, quantity, category, tags, notes.
- Optional details: brand, model, serial number, purchase date, price,
  store/order link.
- Warranty and return windows: end dates and status.
- Attachments: receipts, manuals, warranty documents, links.
- Photos are taken straight from the phone camera in the add flow. A photo
  alone, with the name filled in afterwards, is an acceptable way to add.
- Quantity or individually tracked: "12x AA batteries" vs. "Drill, serial
  123."
- Quantity is a plain count with one-tap +/- on the item and in lists. It may
  be approximate. Used for consumables as well as multiples.
- Tags and notes carry any extra detail (connector type, cable length,
  battery size). No custom fields in the first version.
- Optional "lent to" field: a name. Filling it in sets the status to lent
  out; clearing it marks the item returned.
- Status: in place, in use, lent out, missing, sold, given away, thrown away.
  Items with an ended status move to an archive, not deleted.
- An item keeps its home location while it is in use, lent out or missing,
  so it's clear where it goes back to.
- Links between items: belongs with (charger <-> drill) and part of (kit).
- Duplicate an item to quickly add similar things.
- Item history: created, edited, every move, lent and returned.


ADDING AND UPDATING QUICKLY
---------------------------
- Quick add from anywhere with just a name. It goes into the current bin, or
  an inbox if there isn't one.
- Batch add: after scanning a bin, type, dictate or paste several item names
  one per line.
- Photo-only add: snap several photos in a row, each becomes an item in the
  current bin, named later.
- A "needs details" inbox of items missing a location or name. Missing
  photos, categories and other optional fields never put an item in the
  inbox.
- Inline editing on lists and item pages. No separate edit forms.
- Bulk edit: select many items, then move, tag, change category or change
  status in one step.
- Undo for recent actions. Deleted items can be restored.
- Smart defaults: remember the last location and category used. Suggest tags
  and existing item names as you type, to avoid near-duplicates.
- Adding something that looks like an existing item offers "add to existing
  quantity" instead of creating a duplicate.


KEEPING IT TRUE
---------------
The features that stop the data going stale.
- Every bin shows when its contents were last checked.
- "Contents checked" on a bin page: one tap to confirm the list is right.
- Check mode: open a bin and tick through its list. Anything unticked is
  offered as missing or moved; anything extra is quick-added.
- A "not checked in a long time" view, oldest first, so tidying up has an
  obvious starting point.
- Search results and MCP answers show how recently the item's bin was
  checked, so old information is recognizably old.
- "It's not there": from any item, one tap marks it missing. Finding it
  later asks where it is now.
- No scheduled audits, streaks or nagging. Freshness is shown, not enforced.


SEARCH
------
- One global search box on every page.
- Searches names, brand/model, serial numbers, notes, tags, "lent to" names,
  location names, location summaries and label codes.
- Fuzzy and typo-tolerant, matching words in any order (e.g. "hdmi adapter"
  finds "USB-C to HDMI adapter").
- Results show the location path and a thumbnail, and you can act on them
  right there (move, edit, lend).
- Filters: location (including everything under it), category, tag, status,
  warranty status.
- Saved searches that you can pin.
- Instant results as you type.
- A search with no results offers to add the item right there.


VIEWS ACROSS THE WHOLE HOME
---------------------------
- By category or tag regardless of location: all cables, all chargers, all
  tools, all documents.
- Built-in views:
    - Lent out
    - Missing
    - Warranty expiring soon
    - Return window closing
    - Inbox / no location
    - Recently added
    - Recently moved
    - Not checked in a long time
    - Possible duplicates
- Counts on every view, at a glance.


LIFE OF AN ITEM
---------------
- Lending is just the "lent to" field. The lent-out view lists those items
  with the name and the date it was set. Past loans are in each item's
  history. No due dates, no borrower records.
- Mark missing, and mark found with its new location.
- Retire items (sold, given away, thrown away) with a date. They stay
  searchable in the archive.


MCP
---
Claude should be able to do everything you can do, through tools:
- Find: search, "where is X," list a location's contents, run a view.
- Add: add an item, add several items, create a location or bin.
- Change: edit an item, move an item, move a bin, change quantity, change
  status, lend, return, mark a bin checked.
- Organize: tag, recategorize, link items, merge duplicates.
- Attach: attach a file or link to an item.

Also:
- Answers include the full location path, the label code or link, and when
  the bin was last checked.
- Destructive or bulk actions (delete, merge, many items at once) need
  confirmation.
- MCP access has its own credential that can be revoked without affecting
  the app login.
- The history records who made each change: you in the app, or Claude through
  MCP.
- Natural questions should work: "Do I already own a multimeter?", "What's in
  the garage bins?", "Put the new drill in B-014.", "How many AA batteries do
  we have?"


IMPORT, EXPORT, REPORTS
-----------------------
- Export everything as CSV/JSON, with photos and attachments as a zip.
- Import from CSV.
- Scheduled backups, and a documented restore.
- Insurance export: a list of items with photos, serial numbers, prices and
  receipts, for the whole home or one location. Uses whatever has been
  entered; nothing is required for it.
- A printable contents sheet per location or bin.


ACCESS
------
- One owner account.
- Login session that stays signed in on your phone, so you aren't logging in
  every scan.
- Works behind the home lab's existing access layer (Teleport or LAN). The
  app is not designed to be exposed directly to the internet.
- Nothing in the design should prevent adding household members later.


EXPERIENCE AND QUALITY
----------------------
- Installable on your phone's home screen and fast on mobile.
- Dark mode.
- Large touch targets for one-handed use at a shelf.
- Works over Teleport or the LAN.
- Keeps working on bad signal (garage, basement): recently viewed bins stay
  readable, and adds, moves and quantity changes are saved and sent when the
  connection comes back.
- Fast at a few thousand items: pages and search feel instant.
- Accessible: works with the keyboard and screen readers.
- Simple to run: one service, one place where all data lives, no required
  cloud services or internet access, sensible defaults with little
  configuration.
- Upgrades never lose data or invalidate printed labels.


NON-GOALS
---------
Things Binsight deliberately does not do.
- Food, pantry, recipes, meal planning, expiry dates. That's Grocy.
- Stock management: low-stock alerts, minimum quantities, shopping lists,
  consumption logs, reorder links. Counts are shown, not managed.
- Maintenance scheduling and recurring reminders (replace the filter, test
  the smoke detector). That's Grocy chores or Home Assistant.
- Financial tracking: current value, depreciation, value totals by location
  or category, value over time, "most valuable" views.
- Multi-household, multi-tenant, roles and permissions, public sign-up.
- Public or read-only share links. Access goes through the home lab's access
  layer; to share a bin's contents, print or export its contents sheet.
- A native mobile app. The installable web app is the only client.
- Barcode/UPC scanning with product lookup. Most household things have no
  useful barcode by the time they are stored.
- Floor plans, maps, 3D or visual room layouts. The tree and paths are
  enough.
- User-defined location types, workflows, statuses or dashboards.
- Hand-maintained synonym lists. Fuzzy search and Claude cover this.
- Tracking where an item is moment to moment (check-in/check-out for
  everyday use). "In use" is optional and manual.
- Per-item labels and asset tags.
- Lending management: due dates, overdue tracking, borrower pages.
- Gamification, streaks, audit schedules or completeness scores.
- Importers for other inventory apps. CSV is the one import path.


LATER
-----
Not ruled out, but not part of the first version.
- Household member accounts with per-person attribution in history.
- Vision: photo -> named item, and bin/shelf photos that show what changed.
- Searching the text inside attachments.
- Order-email import.
- Fetching manuals and warranty terms automatically.
- NFC tags as an alternative to QR codes.
- Home Assistant hooks.
- Keyboard shortcuts and a command palette on desktop.
- More item links: uses (batteries a remote takes), replaces.
- Notifications: a periodic digest for warranty or return windows about to
  end. Until then the built-in views show the same information.
- Label print layouts: label-printer sizes and sticker-sheet templates.
- Custom fields per category.
