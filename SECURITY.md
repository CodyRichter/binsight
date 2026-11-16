# Security

## Reporting a vulnerability

Report it privately through GitHub: open the repository's **Security** tab
and choose **Report a vulnerability**. Please do not open a public issue for
a security problem.

Include what you found, how to reproduce it, and which version or commit you
tested.

Binsight is a side project maintained by one person. Reports are read and
answered as time allows, usually within a week. There is no bug bounty.

## Supported versions

Only the latest release receives fixes. Before `v1.0.0`, only the `main`
branch does.

## How Binsight is meant to be run

Binsight is built to sit behind an access layer you already trust: a VPN, an
authenticating reverse proxy, or a network that only your household can
reach. **It is not designed to be exposed directly to the internet**, and it
does not include the protections a public service needs, such as rate
limiting or sign-up controls.

Its own sign-in and its MCP credential are a second layer, not the only one.

## What counts as a vulnerability

Within that setup, these are in scope:

- Reading or changing data without a valid session or MCP credential.
- An MCP credential doing something after it has been revoked.
- Reading or writing files outside the data directory, including through
  uploads, imports, exports or backups.
- Running code or script through item names, notes, attachments, imported
  files or QR codes.
- A destructive MCP action happening without its confirmation step.
- Secrets appearing in logs, exports, backups or error messages.

These are not:

- Anything that requires the app to be exposed directly to the internet
  against the guidance above.
- Anything that requires access to the host, the container or the data
  directory. Whoever has those already has everything.
- Missing protections against a signed-in owner harming their own data.

## For people running it

- Keep it behind your access layer.
- Keep the data directory out of anything public.
- Back up the data directory. It holds everything.
- Revoke an MCP credential you no longer use.
