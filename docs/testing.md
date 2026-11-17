# Testing

What gets tested, where, and how. The rules for writing tests are in the
root [AGENTS.md](../AGENTS.md#tests); this document is the strategy behind
them.

## Layers

| Layer            | Where                        | What it proves                   | Share of tests |
| ---------------- | ---------------------------- | -------------------------------- | -------------- |
| Feature tests    | `backend/tests/features/`    | A feature's rules, called through its service functions against a real SQLite file. | Most |
| API tests        | `backend/tests/features/`    | Routes validate input, return the agreed shapes and error codes. Thin, because the rules are already tested. | Some |
| MCP tests        | `backend/tests/mcp/`         | Each tool reaches the same result as its route, and destructive tools need confirmation. | Some |
| End-to-end tests | `frontend/e2e/`              | The five core flows work in a real browser at phone width against the real backend. | Five, plus a few |

The first three layers run in `scripts/check.sh`. The end-to-end tests run
as their own step in continuous integration, and locally with
`npm run e2e`, so the check script stays quick. Each flow's test starts in the
frontend phase of the [build order](build-order.md) that builds its page;
the tests of the frame itself start in F1.

There are no frontend unit tests for components by default. A component
earns one only when it holds logic worth testing alone, such as splitting
pasted text into item names.

## Structural tests

Tests that guard the shape of the project. These are the ones that stop
drift.

| Test              | Fails when                                               | Exists from |
| ----------------- | -------------------------------------------------------- | ----------- |
| Repository layout | A frontend feature folder has no backend one, a feature is missing from the README table or lacks its three files, a feature imports another's internals, an `AGENTS.md` exceeds 200 lines, or a Python file or function exceeds its size limit. | Now (`scripts/check_repo.py`) |
| Generated types   | The committed frontend types differ from what the backend's contract generates. | B1 |
| Migrations        | A model changed without a migration, or a migration fails against a database that has rows in it. | B1 |
| Parity            | A route's operation name has no MCP tool of the same name, or a tool has no route. | B4 |

## Test data

- One builder module in the backend creates locations, labels and items for
  tests. Tests say what matters to them (`item(name="HDMI cable")`) and take
  defaults for the rest.
- The acceptance setup in [acceptance.md](acceptance.md) is one named
  fixture. The MCP tests use it directly, and the end-to-end run starts the
  backend on a fresh data directory filled from the same fixture.

## Rules that keep tests honest

- Each test builds its own data in a fresh database in a temporary
  directory. No test depends on another or on order.
- No test reaches the network.
- Time is passed in or frozen, never read from the real clock.
- A test's name says the behavior it proves:
  `test_moving_a_location_into_its_own_child_is_refused`.
- A bug fix starts with a test that fails because of the bug.

## What is deliberately left out

- **Coverage percentage targets.** A target is met most cheaply by tests
  that assert nothing. The structural tests and the rule that new behavior
  needs a failing test first do the same job without that incentive.
- **Mocked databases.** SQLite is fast enough to use for real, and its
  behavior is part of what is being tested.
- **Snapshot tests of rendered pages.** They fail on every visual change
  and get approved without being read.
