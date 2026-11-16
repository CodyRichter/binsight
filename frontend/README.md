# Binsight frontend

The web app. A client-only React app, phone first and installable to the
home screen, built into static files that the backend serves
([decision 0008](../docs/decisions/0008-frontend-served-by-backend.md)).

> **Status: foundations.** Tooling is set up; no application code yet. This
> describes the intended stack.

## Tech stack

| Purpose            | Choice                                              |
| ------------------ | --------------------------------------------------- |
| Runtime            | None in production. Node 24 to build and develop.   |
| Build              | Vite, with React and TypeScript                     |
| Pages              | React Router                                        |
| Interface library  | Mantine, with Tabler icons                          |
| Server data        | TanStack Query (React Query)                        |
| Installable app    | A web app manifest. No service worker.              |
| QR scanning        | The phone's own camera for labels; an in-browser scanner for scan-to-move |
| End-to-end tests   | Playwright                                          |
| Lint               | ESLint                                              |
| Format             | Prettier                                            |

Only TypeScript, ESLint and Prettier are installed so far. The rest are
added by the step that first uses them.

## Layout

The folder tree is in the [root README](../README.md#repository-layout),
with the lists of [features](../README.md#features) and
[pages](../README.md#pages) below it. Feature folders use the same names as
the backend.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
