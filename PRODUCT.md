# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner of one household, standing at a shelf with a phone in one hand and
a bin in the other. Their jobs are answering "do we own one?" and "where is
it?", and keeping the answer true by recording what went in, came out or
moved, in the moment it happens.

Claude, connected through MCP from Claude Code or Claude Desktop, is a second
actor that can do everything the owner can. Other self-hosters on GitHub and
other household members are not a design audience today; household member
accounts are listed under LATER in `docs/requirements.md`.

## Product Purpose

A self-hosted home inventory for durable household things and non-food
consumables. Scan a bin's QR label to see or change what is inside; search
for anything and get its full path, e.g. `Garage > Shelf 2 > Bin B-014`.

Success is a record the owner trusts: updating is cheaper than not updating,
so the data does not go stale. The five flows in `docs/requirements.md`
("What the first version must nail") are the measure; everything else is
secondary.

## Positioning

Built for one household and the moment at the shelf, not for collectors or
businesses. Rough and right beats detailed and wrong: a bin with one photo
and a one-line summary is a complete record, only a name is ever required,
and the app shows when a bin was last checked instead of pretending to be
current. Claude has full parity through MCP, and the owner keeps all data on
their own hardware.

## Operating Context

- Phone first, one-handed, often in a garage or storage space; installed to
  the home screen. Desktop use exists but is secondary.
- Physical QR labels with permanent, human-readable codes (`B-014`) that
  survive every upgrade.
- Reached over the home lab's access layer (Teleport or LAN). Never exposed
  directly to the internet; no offline use in the first version.
- Natural-language questions through Claude ("Put the new drill in B-014").

## Capabilities and Constraints

- What the app does and does not do is settled in `docs/requirements.md`,
  including its NON-GOALS and LATER lists. Behavior outside it is asked
  about, not built.
- Every name uses `docs/glossary.md`.
- How the interface looks, reads and is laid out is settled in
  `docs/design-language.md` (decision 0011): tokens, text rules, frame, page
  templates and components.
- Stack: React + Mantine built by Vite, served by one FastAPI process with
  SQLite. See `docs/decisions/`.
- Fast at a few thousand items; dark mode; large touch targets.

## Brand Commitments

- The name is Binsight.
- The voice and visual world are those of `docs/design-language.md`: black
  totes with yellow lids, white sticker labels, steel shelving; short,
  literal words, like labeling a bin.
- There is no logo, app icon or tagline yet. Treat any placeholder as
  unfinished, not as an asset to preserve.

## Evidence on Hand

- No real inventory data, screenshots of use, testimonials or users beyond
  the owner. Do not fabricate any.
- The design language's components render at `/design` in development, with
  screenshot baselines in `frontend/e2e/`.

## Product Principles

1. Updating must be cheaper than not updating. Two taps for find, add, move
   and update.
2. Only a name is required; never nag for the rest.
3. Be honest about what is known: show last checked, never imply currency.
4. When in doubt, leave it out. A feature must make finding or updating
   faster.
5. The screen is the owner's data and the controls to change it, and almost
   nothing else.

## Accessibility & Inclusion

WCAG 2.2 AA. Works with the keyboard and screen readers. Text and controls
are read at arm's length, one-handed: tappable targets are at least 48px
(`touch-min`), and color never carries meaning alone.
