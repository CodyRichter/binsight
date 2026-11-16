# Releasing

How versions are numbered and published. Nothing is released yet; this is
the plan for when there is something to release.

## Versions

- Versions are `vMAJOR.MINOR.PATCH` git tags on `main`.
- Before `v1.0.0`, the app is incomplete and anything may change between
  minor versions.
- From `v1.0.0`:
  - **Patch**: fixes only.
  - **Minor**: new behavior. Upgrading needs no action beyond starting the
    new image.
  - **Major**: upgrading needs the operator to do something by hand.
- `v0.1.0` is tagged when the five core flows pass. `v1.0.0` is tagged when
  everything in the requirements is built. See [build-order.md](build-order.md).

## What a release is

- A tag, a container image published for that tag, and release notes.
- The image is what people run. There is no other supported way to install.

## Release notes

Written for someone running Binsight, not for someone reading the code:

- What changed that they will notice.
- Whether the database is migrated on startup, and roughly how long it
  takes on a large install.
- Anything they must do by hand.

## Promises every release keeps

- Starting a newer image against an older data directory works, and takes a
  copy of the database before changing it.
- No release loses data.
- No release changes the label address format or reuses a code, so printed
  labels keep working.
- Going back to an older image is done by restoring the copy taken before
  the upgrade. Migrations are not reversed in place.
