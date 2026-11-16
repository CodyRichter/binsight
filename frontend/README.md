# Binsight frontend

The web app. A client-only React app, phone first and installable to the
home screen, built into static files that the backend serves
([decision 0008](../docs/decisions/0008-frontend-served-by-backend.md)).

> **Status: foundations.** The toolchain, the Mantine theme and the design
> language's components are in place, shown at `/design` by `npm run dev`.
> No application behavior yet.

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
| Unit tests         | Vitest, React Testing Library, user-event, jsdom    |
| End-to-end tests   | Playwright                                          |
| Lint               | ESLint                                              |
| Format             | Prettier                                            |

Installed so far: Vite, React, React Router, Mantine (core, hooks,
notifications), Tabler icons, the two Atkinson Hyperlegible font families,
TypeScript, ESLint, Prettier, Vitest with React Testing Library, and
Playwright. TanStack Query is added by the step that first uses it.

## Layout

The folder tree is in the [root README](../README.md#repository-layout),
with the lists of [features](../README.md#features) and
[pages](../README.md#pages) below it. Feature folders use the same names as
the backend.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
