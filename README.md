# Binsight

A self-hosted home inventory tracker for one household. It answers two
questions: **"do we own one?"** and **"where is it?"**

Stick a QR label on a bin, scan it with your phone camera, and see or update
what's inside. Search for anything and get its full location path, e.g.
`Garage > Shelf 2 > Cables`. Claude can do everything you can through MCP.

> **Status: 1.0.0. Everything in the requirements is built.** The requirements,
> data model, conventions and checks are in place, and the frontend has the
> design language as working components, shown at `/design` in development.
> The backend starts, migrates its database and serves the frontend, with
> generated API types. A new install makes its first admin at `/login`;
> anyone can browse read-only, accounts sign in to change things by role,
> and `/settings` manages accounts and signs out. `/` shows the
> location tree, a location's page adds locations and items inside it, and
> an item's page shows its path, changes its quantity and lists its
> history, which records every change. Claude Code and Claude Desktop can
> reach the same actions through the MCP server at `/mcp`, with an MCP
> credential as a bearer token, made and revoked in `/settings`. It runs
> as one container from `deploy/compose.yml`, checked from an empty and a
> used data directory by `scripts/check_container.sh`, and the browser
> tests run against that image. Every location has a random code such as
> `K7Q-4MZ`, its address at `/locations/{code}`, and its label downloads
> as a printable PNG with its QR code. Scanning one opens `/l/{code}`,
> which goes to its location's page; locations show their code chips, and
> the API and MCP take a code wherever they take a location. The add bar adds by
> name, several at once, by photo or to an existing item, from a location's
> page or from Add in the navigation, each with Undo; `/inbox` lists what
> still lacks a name or a home. Typing in the search field opens `/search`,
> which finds items and locations as you type, despite typos and in any
> word order, and by label code; the API and MCP search the same way.
> Items move from a row or their page, and locations from their page with
> everything inside them, by picking a place or scanning its label, each
> with Undo; `/scan` opens a scanned label's page.
> Items are deleted and restored from their page, and marked missing and
> found; and an item's page sets its category, tags and details, which
> search finds too. An item is marked in use, lent to someone and
> returned, or sold, given away or thrown away into the archive, which
> leaves its location's contents but stays in search; and items are linked
> as belonging together or as parts of a whole, each with Undo. `/views`
> lists the built-in views across the home with their counts, such as Lent
> out, Warranty expiring soon and the Archive;
> search filters by location, category, tag, status and warranty; and a
> search is saved, pinned into the navigation, renamed and deleted, each
> with Undo, through the API and MCP as well. An item's page attaches
> photos, files such as receipts and manuals, and web links, and a
> location's page gives it a photo, each with Undo. `/settings` downloads
> everything as one zip, data and files, and imports items from a CSV file
> into the locations it names, with Undo; Claude can do both, asking first
> before an import. `/insurance` and each location's insurance list and
> contents sheet are pages made to print, which Claude can read too.
> Binsight backs up its database and files on starting and daily, keeping
> 14, listed in `/settings` with "Back up now", and through MCP; restoring
> is done on the server, as [deploy/README.md](deploy/README.md) describes.
> A location is renamed and described in place, merged into another,
> deleted once its contents have somewhere to go, and dragged into order
> among its siblings, each with Undo; a deleted location's page and label
> offer Restore. Claude can do the same, asking first before a delete or
> merge. Items ticked in a location, search, view or the inbox are moved,
> tagged, recategorized, lent, given a status or deleted together, as one
> change with Undo; Claude asks first before changing many at once. An item's page
> duplicates it, opening the copy, and merges it into another recorded
> twice, each with Undo; Claude asks first before a merge. Search results
> offer Move, and the category sheet lists categories
> picked recently on this device first. It installs to a phone's home
> screen with shortcuts to Scan, Add and Search, and every page, sheet and
> menu is checked against WCAG 2.1 AA in light and dark and used by
> keyboard alone in the browser tests.

## Documents

| Document                                         | What it settles                         |
| ------------------------------------------------ | --------------------------------------- |
| [Requirements](docs/requirements.md)            | What the app does, and what it deliberately does not |
| [Glossary](docs/glossary.md)                     | The one word for each concept           |
| [Data model](docs/data-model.md)                 | What is stored and the rules that always hold |
| [Acceptance criteria](docs/acceptance.md)        | The five core flows as steps and results |
| [API conventions](docs/api-conventions.md)       | How every endpoint and MCP tool behaves |
| [Design language](docs/design-language.md)       | How the interface looks, reads and is laid out |
| [Build order](docs/build-order.md)               | The sequence the app is built in        |
| [Testing](docs/testing.md)                       | What is tested, where, and how          |
| [Decisions](docs/decisions/README.md)            | Choices that are settled, and why       |
| [AGENTS.md](AGENTS.md)                           | Rules for anyone changing the code      |
| [Security](SECURITY.md)                          | How to report a problem, and how to run it safely |

## The five flows that matter

Everything else is secondary to these:

1. Scan a bin label and see what's in it.
2. Scan a bin label and add things to it by name or photo.
3. Search for a thing and see its full location path.
4. Move a thing or a whole bin in two taps or two scans.
5. Ask Claude any of the above through MCP.

## Technology

| Part     | Choice                                   |
| -------- | ---------------------------------------- |
| Frontend | React, built with Vite into static files (installable, phone first) |
| Backend  | FastAPI, serving the API, the MCP server and the frontend's files |
| Database | SQLite, one file                         |
| Runs as  | One container, one process, one data volume |

The reasons are in the [decisions](docs/decisions/README.md). Running it is
covered in [deploy/README.md](deploy/README.md).

## Repository layout

Folders appear as the [build order](docs/build-order.md) reaches them. This
is where things go.

```
binsight/
├── README.md
├── AGENTS.md                Rules for changing the code (CLAUDE.md imports it)
├── SECURITY.md
├── LICENSE                  AGPL-3.0
├── ruff.toml                Python lint rules and limits
├── docs/                    Requirements, data model, conventions, decisions
├── backend/                 FastAPI application
│   ├── app/
│   │   ├── core/            Settings, database sessions, shared errors
│   │   ├── models/          Database tables, all in one place
│   │   ├── features/        One folder per feature (see below)
│   │   └── mcp/             MCP server and its tools
│   ├── migrations/
│   │   └── versions/        Database schema migrations
│   └── tests/
│       ├── features/        Tests per feature
│       └── mcp/             Tests for the MCP tools
├── frontend/                React application
│   ├── public/              Icons and the web app manifest
│   ├── src/
│   │   ├── pages/           One thin file per page (see below)
│   │   ├── features/        One folder per feature: its components and hooks
│   │   ├── components/      The design language's components, and pieces shared by features
│   │   ├── lib/api/         The one client used to call the backend
│   │   ├── lib/theme/       The Mantine theme: every design token, set once
│   │   └── types/           Shared data shapes, including the generated ones
│   └── e2e/                 End-to-end tests, one per flow listed above, and checks of /design
├── deploy/                  Container image and compose file
├── scripts/                 setup.sh, check.sh, check_container.sh, and the agent hooks
├── .claude/                 Shared Claude Code permissions and hooks
├── .agents/                 The same rules, hooks and skills for Antigravity
└── .github/                 Continuous integration and dependency updates
```

## Working on it

Needs [uv](https://docs.astral.sh/uv/) and Node 24 or newer. The Claude Code
and Antigravity hooks also need `jq`.

```
scripts/setup.sh    # install tooling
scripts/check.sh    # every check; must pass before any change is done
```

### Features

The backend and frontend use the same feature names, so anything about a
feature is in the folder with its name on both sides. This table is the
plan for all of them; a folder that exists must be listed here.

| Feature         | What it covers                                              |
| --------------- | ----------------------------------------------------------- |
| `auth`          | Accounts and roles, long-lived sessions, MCP credentials    |
| `locations`     | The nested tree of places, their codes, moving, merging, deleting |
| `labels`        | A location's label as a printable QR image, and Direct Print to the print address |
| `items`         | Items, quantity, status, "lent to", links, categories, tags, quick and batch add, bulk edit, inbox |
| `attachments`   | Photos and files on items and locations                     |
| `search`        | Global fuzzy search and filters                             |
| `views`         | Built-in views and pinned saved searches                    |
| `history`       | Change history, undo, restoring deleted items, MCP confirmations |
| `import_export` | CSV import, full export, insurance list, contents sheets    |
| `backups`       | Scheduled backups and restore                               |
| `scan`          | Frontend only: the in-app scanner used for scan-to-move     |
| `design`        | Frontend only, development builds: the design language rendered |

The frontend folder for `import_export` is named `import-export`.

### Pages

| Path                | Page                                                    |
| ------------------- | ------------------------------------------------------- |
| `/`                 | The tree of the whole home; `/?add` opens Add, the home screen shortcut |
| `/l/{code}`         | Where a scanned QR code lands, e.g. `/l/K7Q-4MZ`; opens `/locations/{code}` |
| `/locations/{id}`   | A location and its contents                             |
| `/items/{id}`       | An item                                                 |
| `/search`           | Search results                                          |
| `/views`            | Every view, with its count                              |
| `/views/{view}`     | A built-in view or saved search                         |
| `/inbox`            | Items still missing a name or location                  |
| `/scan`             | The in-app scanner                                      |
| `/settings`         | Labels, export, backups, MCP credentials                |
| `/insurance`        | The insurance list of the whole home, to print          |
| `/locations/{id}/insurance` | The insurance list of one location, to print   |
| `/locations/{id}/sheet` | A location's contents sheet, to print               |
| `/login`            | Sign in, and making the first admin on a new install    |
| `/design`           | Development builds only: every component and token      |

`/l/{code}` is printed on every label, so it can never change
([decision 0004](docs/decisions/0004-permanent-labels.md)).

## License

[AGPL-3.0](LICENSE)
