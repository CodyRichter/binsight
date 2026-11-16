# Binsight deployment

Everything needed to run Binsight: the container image definition and a
compose file.

> **Status: planning.** No files yet. This describes the intended setup.

## Tech stack

| Purpose        | Choice                                                   |
| -------------- | -------------------------------------------------------- |
| Packaging      | One container image holding the frontend and the backend |
| Running it     | Docker Compose, one service                              |
| Storage        | One data volume on local disk                            |
| Database       | SQLite inside the data volume. No database container.    |
| Access         | Behind an existing access layer (a reverse proxy, VPN, Teleport, or LAN only) |

## What a deployment consists of

One container, one port, one volume.

```
data/                    The mounted volume
├── binsight.db          The SQLite database
├── attachments/         Photos and files
└── backups/             Scheduled backups
```

Backing up Binsight means copying this directory. Restoring means putting it
back.

## Settings

Set once at install time:

- **The app's address** (e.g. `https://binsight.example.com`). QR codes are
  printed with this address, so it is permanent. Changing it later means
  reprinting every label.
- **The data directory** location.
- **A secret** for signing login sessions.

## Open decision

The image holds two programs: the Next.js server and the FastAPI backend.
Which one answers on the public port is not settled. The current plan is for
Next.js to answer and pass `/api` and `/mcp` through to the backend inside
the container.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
