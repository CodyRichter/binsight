# Binsight

A self-hosted home inventory tracker for one household. It answers two
questions: **"do we own one?"** and **"where is it?"**

Stick a QR label on a bin, scan it with your phone camera, and see or update
what's inside. Search for anything and get its full location path, e.g.
`Garage > Shelf 2 > Bin B-014`. Claude can do everything you can through MCP.

> **Status: sign-in (phase F2).** The requirements, data model, conventions
> and checks are in place, and the frontend has the design language as
> working components, shown at `/design` in development. The backend starts,
> migrates its database and serves the frontend, with generated API types.
> A new install asks for a password at `/login`, every other page needs
> sign-in, and `/settings` signs out; no other page exists yet.
> Each backend phase is now followed by its frontend phase; see the
> [build order](docs/build-order.md).

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
├── scripts/                 setup.sh, check.sh, and the Claude Code hooks
├── .claude/                 Shared Claude Code permissions and hooks
└── .github/                 Continuous integration and dependency updates
```

## Working on it

Needs [uv](https://docs.astral.sh/uv/) and Node 24 or newer. The Claude Code
hooks also need `jq`.

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
| `auth`          | Owner login, long-lived sessions, MCP credentials           |
| `locations`     | The nested tree of places, moving, merging, deleting        |
| `labels`        | Label codes, QR images, blank labels and claiming them      |
| `items`         | Items, quantity, status, "lent to", links, categories, tags, quick and batch add, bulk edit, inbox |
| `checks`        | "Contents checked", check mode, last-checked dates          |
| `attachments`   | Photos and files on items and locations                     |
| `search`        | Global fuzzy search and filters                             |
| `views`         | Built-in views and pinned saved searches                    |
| `history`       | Change history, undo, restoring deleted items, MCP confirmations |
| `import_export` | CSV import, full export, insurance export, contents sheets  |
| `backups`       | Scheduled backups and restore                               |
| `scan`          | Frontend only: the in-app scanner used for scan-to-move     |
| `design`        | Frontend only, development builds: the design language rendered |

The frontend folder for `import_export` is named `import-export`.

### Pages

| Path                | Page                                                    |
| ------------------- | ------------------------------------------------------- |
| `/`                 | The tree of the whole home                              |
| `/l/{code}`         | Where a scanned QR code lands, e.g. `/l/B-014`          |
| `/locations/{id}`   | A location and its contents                             |
| `/items/{id}`       | An item                                                 |
| `/search`           | Search results                                          |
| `/views`            | Every view, with its count                              |
| `/views/{view}`     | A built-in view or saved search                         |
| `/inbox`            | Items still missing a name or location                  |
| `/scan`             | The in-app scanner                                      |
| `/settings`         | Labels, export, backups, MCP credentials                |
| `/login`            | Sign in, and creating the owner on a new install        |
| `/design`           | Development builds only: every component and token      |
| `/design/{template}` | Development builds only: each page template from sample data |

`/l/{code}` is printed on every label, so it can never change
([decision 0004](docs/decisions/0004-permanent-labels.md)).

## License

[AGPL-3.0](LICENSE)
