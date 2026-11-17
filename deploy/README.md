# Binsight deployment

Everything needed to run Binsight: the container image definition and a
compose file.

## Tech stack

| Purpose        | Choice                                                   |
| -------------- | -------------------------------------------------------- |
| Packaging      | One container image. A Node stage builds the frontend's files; the final image holds Python and those files. |
| Running it     | Docker Compose, one service                              |
| Storage        | One data volume on local disk                            |
| Database       | SQLite inside the data volume. No database container.    |
| Access         | Behind an existing access layer (a reverse proxy, VPN, Teleport, or LAN only) |

## Running it

From the repository root:

```
cp deploy/.env.example deploy/.env    # then set BINSIGHT_APP_ADDRESS
docker compose -f deploy/compose.yml up --build -d
docker compose -f deploy/compose.yml ps    # shows "healthy" once it is ready
```

The app listens on port 8000. Open it at its address and choose the owner's
password. The container refuses to start until `BINSIGHT_APP_ADDRESS` is
set.

The container runs as uid 1000, and its root file system is read-only. On
Linux, the data directory must be writable by uid 1000:

```
mkdir -p deploy/data && sudo chown 1000:1000 deploy/data
```

To upgrade, pull the new code and run the same `up --build -d`. The
database is copied into `backups/` before any migration runs.

## Settings

Set in `deploy/.env`, once at install time.

| Variable                  | Default  | What it is |
| ------------------------- | -------- | ---------- |
| `BINSIGHT_APP_ADDRESS`    | None     | The address the app is reached at, such as `https://binsight.example.com`. QR codes are printed with it, so it is permanent ([decision 0004](../docs/decisions/0004-permanent-labels.md)). |
| `BINSIGHT_DATA_DIRECTORY` | `./data` | Where the data directory is on this machine, relative to `deploy/`. Local disk only. |

## What a deployment consists of

One container, one process, one port, one volume.

```
data/                    The mounted volume
├── binsight.db          The SQLite database
├── attachments/         Photos and files
└── backups/             Copies of the database
```

Everything Binsight stores is in this directory, and it is not part of the
repository.

To back it up by hand, stop the container and copy the directory; restoring
is putting it back. Copying the database file while the app is running can
produce a broken copy. On Linux, copy with `sudo cp -a` so the files stay
owned by uid 1000, or `chown` the restored directory again.

Today `backups/` holds the copy taken before each upgrade. Scheduled
backups, safe to take while the app runs, arrive in a later step of the
[build order](../docs/build-order.md); until then, back up by hand.

## Checking it

`scripts/check_container.sh` builds the image and starts it from an empty
data directory and from a copy of a used one. It needs Docker, `curl` and
`jq`, and uses port 18000 and its own temporary directories, so it does not
touch `deploy/.env` or `deploy/data/`. From `frontend/`, `npm run e2e:container`
builds the image and runs the browser tests against it on port 18001, with
its own empty data directory.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
