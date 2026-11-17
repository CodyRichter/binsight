# AGENTS.md (deploy)

Adds to the [root AGENTS.md](../AGENTS.md), which applies here in full.
The intended setup is in [README.md](README.md).

## Check your work

`scripts/check_container.sh` builds the image and starts it against an empty
data directory, then against a copy of a used one. A deployment change is
not done until it passes, and until `npm run e2e:container`, run from
`frontend/`, passes the browser tests against the image. To run the app by
hand:

```
docker compose -f deploy/compose.yml up --build
```

## The shape that must not change

- One container, one port, one volume. Running Binsight takes a single
  compose file and no other services.
- All persistent state is in the data volume: the database, attachments and
  backups. Nothing that matters is written anywhere else in the container.
- Exactly one process: the backend, which also serves the frontend's built
  files. No Node program runs in the final image.
- The data volume is on local disk. SQLite can corrupt on NFS or SMB.

## Starting up

- Migrations run on startup, after a copy of the database file is taken.
- Every setting comes from an environment variable, is listed in the README,
  and appears in the example env file. Settings have defaults that work for
  a fresh install.
- The one exception has no default: the app's address. The container
  refuses to start without it.
- The app's address is treated as permanent because it is printed on every
  label. Do not add tooling that makes changing it look routine.
- The container runs as a non-root user and has a health check.
- Base image versions are pinned.
- Backups copy the database with SQLite's own backup command, never by
  copying the file of a running database.

## This repository is public

- Examples use placeholders such as `binsight.example.com`.
- No real hostnames, addresses, credentials or anything specific to one home
  lab. That belongs in the operator's private configuration.
- No secrets or data baked into the image.

## Do not

- Add a database container, a bundled reverse proxy, or any other required
  service.
- Run multiple workers or replicas.
- Add public sign-up or rate-limiting infrastructure. The app sits behind an
  existing access layer and is not exposed to the internet.
- Require internet access or a cloud service to build, start or run.
- Ship an upgrade that loses data or invalidates printed labels.
