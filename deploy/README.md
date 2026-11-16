# Binsight deployment

Everything needed to run Binsight: the container image definition and a
compose file.

> **Status: planning.** No files yet. This describes the intended setup.

## Tech stack

| Purpose        | Choice                                                   |
| -------------- | -------------------------------------------------------- |
| Packaging      | One container image. A Node stage builds the frontend's files; the final image holds Python and those files. |
| Running it     | Docker Compose, one service                              |
| Storage        | One data volume on local disk                            |
| Database       | SQLite inside the data volume. No database container.    |
| Access         | Behind an existing access layer (a reverse proxy, VPN, Teleport, or LAN only) |

## What a deployment consists of

One container, one process, one port, one volume.

```
data/                    The mounted volume
├── binsight.db          The SQLite database
├── attachments/         Photos and files
└── backups/             Scheduled backups
```

Everything Binsight stores is in this directory, and it is not part of the
repository.

To back it up by hand, stop the container and copy the directory; restoring
is putting it back. Copying the database file while the app is running can
produce a broken copy. The app's own scheduled backups are safe to take
while it runs, and land in `backups/`; copy that folder somewhere off the
machine.

## Settings

Set once at install time:

- **The app's address** (e.g. `https://binsight.example.com`). QR codes are
  printed with this address, so it is permanent
  ([decision 0004](../docs/decisions/0004-permanent-labels.md)).
- **The data directory** location.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
