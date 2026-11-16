# Binsight

A self-hosted home inventory tracker for one household. It answers two
questions: **"do we own one?"** and **"where is it?"**

Stick a QR label on a bin, scan it with your phone camera, and see or update
what's inside. Search for anything and get its full location path, e.g.
`Garage > Shelf 2 > Bin B-014`. Claude can do everything you can through MCP.

> **Status: foundations.** The requirements, data model, conventions and
> checks are in place. No application code has been written yet. See the
> [build order](docs/build-order.md) for what comes next.

## Documents

| Document                                         | What it settles                         |
| ------------------------------------------------ | --------------------------------------- |
| [Requirements](docs/requirements.md)            | What the app does, and what it deliberately does not |
| [Glossary](docs/glossary.md)                     | The one word for each concept           |
| [Data model](docs/data-model.md)                 | What is stored and the rules that always hold |
| [Acceptance criteria](docs/acceptance.md)        | The five core flows as steps and results |
| [API conventions](docs/api-conventions.md)       | How every endpoint and MCP tool behaves |
| [Build order](docs/build-order.md)               | The sequence the app is built in        |
| [Testing](docs/testing.md)                       | What is tested, where, and how          |
| [Decisions](docs/decisions/README.md)            | Choices that are settled, and why       |
| [Releasing](docs/releasing.md)                   | Versions and what every release promises |
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
| Frontend | Next.js (installable web app, phone first) |
| Backend  | FastAPI, with the MCP server in the same process |
| Database | SQLite, one file, write-ahead-log mode   |
| Runs as  | One container with one data volume       |

SQLite is the only supported database. The backend runs as a single process,
and the database file must sit on local disk, not a network share.

## Repository layout

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
│   │   ├── core/            Settings, database setup, shared errors
│   │   ├── models/          Database tables, all in one place
│   │   ├── features/        One folder per feature (see below)
│   │   └── mcp/             MCP server and its tools
│   ├── migrations/
│   │   └── versions/        Database schema migrations
│   └── tests/
│       ├── features/        Tests per feature
│       └── mcp/             Tests for the MCP tools
├── frontend/                Next.js application
│   ├── public/              Icons and the web app manifest
│   ├── src/
│   │   ├── app/             Pages (see below)
│   │   ├── features/        One folder per feature: its components and hooks
│   │   ├── components/      Shared interface pieces used by several features
│   │   ├── lib/
│   │   │   ├── api/         The one client used to call the backend
│   │   │   └── offline/     Cached pages and the queue of unsent changes
│   │   ├── styles/          Theme, including dark mode
│   │   └── types/           Shared data shapes
│   └── e2e/                 End-to-end tests, one per flow listed above
├── deploy/                  Container image and compose file
├── scripts/                 setup.sh, check.sh, and the Claude Code hooks
├── .claude/                 Shared Claude Code permissions and hooks
└── .github/                 Continuous integration and dependency updates
```

## Working on it

Needs [uv](https://docs.astral.sh/uv/) and Node 24 or newer.

```
scripts/setup.sh    # install tooling
scripts/check.sh    # every check; must pass before any change is done
```

### Features

The backend and frontend use the same feature names, so anything about a
feature is in the folder with its name on both sides. Each maps to a section
of the requirements.

| Feature         | What it covers                                              |
| --------------- | ----------------------------------------------------------- |
| `auth`          | Owner login, long-lived sessions, the MCP credential        |
| `locations`     | The nested tree of places, moving, merging, deleting        |
| `labels`        | Label codes, QR images, blank labels and claiming them      |
| `items`         | Items, quantity, status, "lent to", links, quick and batch add, inbox |
| `checks`        | "Contents checked", check mode, last-checked dates          |
| `attachments`   | Photos and files on items and locations                     |
| `search`        | Global fuzzy search and filters                             |
| `views`         | Built-in views and pinned saved searches                    |
| `history`       | Change history, undo, restoring deleted items               |
| `import_export` | CSV import, full export, insurance export, contents sheets  |
| `backups`       | Scheduled backups and restore                               |
| `scan`          | Frontend only: the in-app scanner used for scan-to-move     |

The frontend folder for `import_export` is named `import-export`.

### Pages

| Path                | Page                                                    |
| ------------------- | ------------------------------------------------------- |
| `/`                 | The tree of the whole home                              |
| `/l/[code]`         | Where a scanned QR code lands, e.g. `/l/B-014`          |
| `/locations/[id]`   | A location and its contents                             |
| `/items/[id]`       | An item                                                 |
| `/search`           | Search results                                          |
| `/views/[view]`     | A built-in view or saved search                         |
| `/inbox`            | Items still missing a name or location                  |
| `/scan`             | The in-app scanner                                      |
| `/settings`         | Labels, export, backups, the MCP credential             |
| `/login`            | Sign in                                                 |

`/l/[code]` is printed on every label, so that path can never change.

## Rules for the code

These keep the layout understandable as it fills in.

- **One place for behavior.** Each backend feature owns its rules. The web
  API and the MCP tools are both thin layers that call the same feature code,
  so Claude and the app can never behave differently.
- **Features do not reach into each other's internals.** A feature calls
  another feature through its public functions only.
- **Tables are defined once**, in `backend/app/models/`, because they relate
  across features.
- **Every change goes through `history`**, so undo and "who changed this"
  work everywhere without each feature reimplementing them.
- **Pages are thin.** Files under `frontend/src/app/` arrange components from
  `features/`; they hold no logic of their own.
- **The frontend calls the backend only through `lib/api/`.**

## Data

Everything Binsight stores lives in one data directory, mounted as a volume:

```
data/
├── binsight.db      The SQLite database
├── attachments/     Photos and files
└── backups/         Scheduled backups
```

Backing up Binsight means copying this directory. It is not part of the
repository.

## License

[AGPL-3.0](LICENSE)
