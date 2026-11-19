# 0022: Accounts with three fixed roles, and reading without signing in

Status: Accepted

## Context

An install had one owner record and one password, and every route needed a
sign-in. A household shares the app: someone standing at a shelf should be
able to see what is in a bin without an account, and only some people
should change things. Nothing was deployed, so the old owner record could be
dropped.

## Decision

- Each person has an account: a username and a password. There is no email
  and no verification. The first visit to a new install makes the first
  account, an admin; admins make the rest.
- Roles are fixed: `viewer`, `editor`, `admin`, each allowed everything the
  one before it is. There are no custom roles and no per-location rights.
- Reading the home needs no sign-in. A visitor does not see private
  details: prices, serial numbers, order links, files, history and the
  insurance list. Photos are not private: a bin is recognized by them.
- Which role a route needs is set where `main.py` includes its router, and a
  test fails when a route is in no group.
- The role is read from the database on every request, not kept in the
  cookie, so demoting or deleting an account takes effect at once.
- History keeps the username of the account that made a change, as text.
  It outlives the account and needs no join.
- An MCP credential acts as an editor. Only admins make or revoke one, and
  no MCP tool manages accounts or credentials.

## Why

- The app sits behind the home lab's access layer
  ([SECURITY.md](../../SECURITY.md)), so anyone who can open it is already
  in the household's trust circle. Hiding private details is enough for
  reading; changes still need an account.
- Three fixed roles cover a household. Anything finer is a settings page
  nobody maintains.

## Cost

- Searching by an exact serial number still finds an item for a visitor; it
  reveals only what was typed.
- A deleted account leaves its username in history.
- Upgrading drops the old owner and its login sessions: the next visit asks
  for the first admin's username and password.
