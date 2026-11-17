# AGENTS.md

Rules for anyone, human or agent, changing this repository. They apply
everywhere. `backend/`, `frontend/` and `deploy/` each add their own
`AGENTS.md`; where one of those disagrees with this file, it wins for that
folder.

Binsight is a home inventory app whose whole value is being quick to update
and easy to trust. The code is held to the same standard: small, plain, and
obvious to the next reader.

## Before you write anything

1. Read [docs/requirements.md](docs/requirements.md). It is the source of
   truth for what the app does.
2. If the behavior you were asked for is not in the requirements, or is
   listed under NON-GOALS or LATER, stop and ask. Do not build it and do not
   edit the requirements to make it fit.
3. If the requirements do change, change the document in the same commit as
   the code.
4. Use the words in [docs/glossary.md](docs/glossary.md), spelled that way,
   for every name. A new concept is added there before it is named in code.
5. Follow [docs/data-model.md](docs/data-model.md) and
   [docs/api-conventions.md](docs/api-conventions.md). They are decided, not
   suggestions.
6. Treat [docs/decisions/](docs/decisions/README.md) as settled. To change
   one, propose a new decision; do not work around it.
7. Search for existing code that already does the job. Extend it rather than
   writing a second version.

## Done means

A change is done only when all of these are true:

- `scripts/check.sh` passes. It runs lint, type checks, tests and a
  production build for both apps, and is the one command that says pass or
  fail.
- New behavior has a test that fails without the change.
- A new user action exists in both the web API and the MCP tools.
- Every feature folder and page that exists is in the tables in
  [README.md](README.md).
- You have said plainly what you ran and what you could not verify. Never
  report something as working that you did not run.

Run `scripts/setup.sh` once to install tooling. Work proceeds in the order
given in [docs/build-order.md](docs/build-order.md), and a step's acceptance
criteria are in [docs/acceptance.md](docs/acceptance.md).

## Scope of a change

- Make the smallest change that does what was asked. One concern per change.
- Leave surrounding code alone. No reformatting, renaming or "while I was
  here" cleanups in files you were not asked to touch. Mention them instead.
- Finish what you start. No stubs, placeholder functions, or half-wired
  features left for later.
- Delete code you replace. Nothing is kept "just in case"; git has the
  history.
- Ask before adding a dependency, and say what it replaces writing by hand.
- Do not commit or push unless asked.

## Keep it plain

- No abstraction until the third use. Two similar functions are fine; a base
  class, generic helper or plugin point written for one caller is not.
- No options, flags or settings that nothing uses today.
- No compatibility shims or deprecated paths. There are no outside users to
  protect; change the code and its callers together.
- No `utils`, `helpers`, `common` or `misc` files. Code lives in the feature
  that owns it, or in `core/` or `lib/` under a name that says what it does.
- Validate input once, at the edge: API schemas, MCP tool inputs, forms.
  Inside, trust it. No checks for cases that cannot happen.
- Let errors surface. Never catch an exception to ignore it, log it and
  carry on, or return a default. Catch only where you can do something
  specific about it.
- Names say what a thing is. No abbreviations, no `data`, `info`, `manager`,
  `handler2`, `new_`, `final`.

## Size limits

When you hit a limit, split the code. Do not raise the limit or suppress the
check.

| What                               | Limit      |
| ---------------------------------- | ---------- |
| Function or method                 | 40 lines   |
| Source file                        | 300 lines  |
| React component file               | 150 lines, one component per file |
| Function parameters                | 5          |
| Nesting depth                      | 3 levels   |
| Branching complexity               | 10         |

Test files may run longer than 300 lines; each test still follows the
function limit.

## Comments

The default is no comment. Names, types and small functions explain what the
code does. A comment is for the one thing code cannot say: why.

Write a comment only for:

- A constraint a reader could not guess (`# SQLite cannot alter a column, so
  this migration rebuilds the table`).
- A decision that looks wrong but is deliberate.
- A workaround, with a link to the issue it works around.

Limits:

- Two lines at most. If it needs more, the code needs restructuring or the
  explanation belongs in a README.
- Public service functions get a one-line docstring saying what they do, in
  terms a user of the app would recognize. No `Args:` or `Returns:` blocks
  repeating the type hints.
- MCP tool descriptions are the exception to the length limit. Claude reads
  them to decide what to call, so they say what the tool does, when to use
  it, and what it returns.

Never write:

- Commented-out code.
- A comment that restates the line below it.
- A comment about the change itself: "added", "fixed", "now uses",
  "previously", "updated to", "as requested".
- A comment addressed to a reviewer or to whoever asked for the change.
- `TODO`, `FIXME`, `HACK` or `XXX`. Open an issue, or do it now.
- Divider banners, ASCII art, or emoji.
- Mentions of the tool, model or prompt that produced the code.

A comment that no longer matches the code is a bug. Change or delete it in
the same edit.

## Tests

- Test behavior through the feature's public functions or the API, not its
  private details. A refactor that keeps behavior should not break tests.
- Use the real database, a SQLite file in a temporary directory. Do not mock
  it.
- Never weaken, skip or delete a test to make a change pass. If a test is
  wrong, say so and fix it as its own change.
- No tests for cases that cannot happen, and no tests that only assert a
  mock was called.

## Suppressions

`# noqa`, `# type: ignore`, `eslint-disable`, `@ts-ignore`, `any`, and
skipped tests are each a last resort. Every one carries a reason on the same
line. An unexplained suppression fails review.

## Things not to create

- Planning, summary, notes or changelog files describing your work. Say it
  in the commit message or the reply.
- New top-level folders, or new feature folders, without the README tables
  being updated in the same change.
- Scripts that duplicate what `scripts/check.sh` already runs.

## Enforced by tools, not by this file

A rule with no exceptions belongs in a tool that fails the build
([decision 0007](docs/decisions/0007-enforce-with-tools.md)). The tool is
the authority; this table says where to look.

| Rule                                        | Enforced by               |
| ------------------------------------------- | ------------------------- |
| Python lint, formatting, type hints present, parameters, nesting, complexity, commented-out code, TODO markers, `print` | `ruff.toml` |
| Python type hints correct                   | mypy, set up in `backend/pyproject.toml` |
| Python file and function length             | `scripts/check_repo.py`   |
| Every frontend feature folder has a backend one, and all are in the README; each has its three files; a feature imports another only through its service; no `utils` files; `AGENTS.md` length | `scripts/check_repo.py` |
| Frontend size limits, nesting, `any`, `console.log`, TODO markers, feature import boundaries, `fetch` outside `lib/api`, unexplained `eslint-disable`, the design language's no-exception rules | `frontend/eslint.config.mjs` |
| Design color tokens and type styles match the document; CSS only in `src/components/` and `src/lib/theme/`, with no hex colors | `scripts/check_repo.py` |
| Frontend formatting                         | Prettier                  |
| Every route has an MCP tool of the same name, and every tool a route | `backend/tests/mcp/test_parity.py` |
| Formatting on edit; no finishing while checks fail; no reading `.env` or the data directory | `.claude/settings.json` |
| The container builds and starts from an empty data directory and a copy of a used one | `scripts/check_container.sh` |
| The browser tests pass against the built container image | `npm run e2e:container` in `frontend/` |
| Everything above, on every pull request     | `.github/workflows/ci.yml` |

Frontend type checking, the production build and the staleness of the
generated API types run in `scripts/check.sh`, and the migration test runs
with the backend tests. Each flow's end-to-end test arrives in the frontend
phase that builds its page.

If a rule here is being broken repeatedly, add a check for it rather than
writing the rule in stronger words.

## Changing this file

- Add a rule only after the same mistake has happened twice.
- Keep each `AGENTS.md` under 200 lines. Longer files get followed less.
- Do not restate what the code or a README already shows.
- When a tool starts enforcing a rule, shorten the rule here to one line.
