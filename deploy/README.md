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

The app listens on port 8000. Open it at its address and make the first account,
an admin, with a username and password; add the household's accounts in
Settings. The container refuses to start until `BINSIGHT_APP_ADDRESS` is
set.

To install it on a phone, open the address and use the browser's "Add to
Home Screen". On iOS the installed app keeps its own sign-in apart from
Safari's, so sign in once more inside it.

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
└── backups/             Daily backups, and the copy taken before each upgrade
```

Everything Binsight stores is in this directory, and it is not part of the
repository.

## Backups

Binsight backs itself up when it starts and then once a day while it runs,
keeping the newest 14. Each backup is a folder, `backups/{time}/`, such as
`backups/20261118T030000Z/`, holding a copy of `binsight.db` taken with
SQLite's own backup command and `attachments/` as hard links to the stored
files, which never change, so they take no extra space. "Back up now" in
`/settings` takes one at once. The copies taken before upgrades,
`backups/before-upgrade-*.db`, are kept until removed by hand.

These backups are on the same disk as everything else. They protect against
mistakes, not a failed disk: copy the data directory to another machine as
well. Stop the container first, since copying the database file while the
app runs can produce a broken copy, and on Linux copy with `sudo cp -a` so
the files keep uid 1000 as their owner and the hard links stay links.

## Restoring

Restoring puts one backup's database and files back in place of the
current ones. Everything changed since that backup is lost.

1. Stop the app: `docker compose -f deploy/compose.yml down`.
2. In the data directory, move the current `binsight.db` and
   `attachments/` aside, for example into a folder named `replaced/`, and
   delete any `binsight.db-wal` and `binsight.db-shm` beside them. Those
   belong to the database being replaced and would damage the restored one.
3. Copy the chosen backup's `binsight.db` and `attachments/` into the data
   directory: `sudo cp -a backups/{time}/binsight.db backups/{time}/attachments .`
4. Start the app: `docker compose -f deploy/compose.yml up -d`. A backup
   from an older version is upgraded on start, as after any upgrade.
5. Sign in and check the app. Then delete the folder from step 2.

A data directory copied off the machine is restored the same way: stop the
app, put the whole directory back, and start it.

## Checking it

`scripts/check_container.sh` builds the image and starts it from an empty
data directory and from a copy of a used one. It needs Docker, `curl` and
`jq`, and uses port 18000 and its own temporary directories, so it does not
touch `deploy/.env` or `deploy/data/`. From `frontend/`, `npm run e2e:container`
builds the image and runs the browser tests against it on port 18001, with
its own empty data directory.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
