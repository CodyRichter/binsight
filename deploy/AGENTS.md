# AGENTS.md (deploy)

Adds to the [root AGENTS.md](../AGENTS.md), which applies here in full.
The intended setup is in [README.md](README.md).

## Check your work

Build the image and start it against an empty data directory, then against
a copy of an existing one:

```
docker compose -f deploy/compose.yml up --build
```

A deployment change is not done until the container starts healthy in both
cases. Say which of the two you ran.

## The shape that must not change

- One container, one port, one volume. Running Binsight takes a single
  compose file and no other services.
- All persistent state is in the data volume: the database, attachments and
  backups. Nothing that matters is written anywhere else in the container.
- Exactly one backend process. SQLite's locking and the in-process MCP
  server both depend on it.
- The data volume is on local disk. SQLite can corrupt on NFS or SMB.

## Starting up

- Migrations run on startup, after a copy of the database file is taken.
- Every setting comes from an environment variable, is listed in the README,
  and appears in the example env file. Settings have defaults that work for
  a fresh install.
- The two exceptions have no default: the app's address and the session
  secret. The container refuses to start without them.
- The app's address is treated as permanent because it is printed on every
  label. Do not add tooling that makes changing it look routine.
- The container runs as a non-root user and has a health check.
- Base image versions are pinned.

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
