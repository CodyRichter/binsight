# Binsight frontend

The web app. A client-only React app, phone first and installable to the
home screen, built into static files that the backend serves
([decision 0008](../docs/decisions/0008-frontend-served-by-backend.md)).

> **Status: sign-in (phase F2).** The design language's components are
> shown at `/design` by `npm run dev`. `/login` creates the owner or signs
> in, and `/settings` signs out. Every other address shows "Nothing at this
> address" once signed in.

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
TanStack Query, TypeScript, ESLint, Prettier, Vitest with React Testing
Library, and Playwright.

## Layout

The folder tree is in the [root README](../README.md#repository-layout),
with the lists of [features](../README.md#features) and
[pages](../README.md#pages) below it. Feature folders use the same names as
the backend.

## Running it with the backend

In development the backend and Vite run side by side, and Vite passes
`/api` and `/mcp` on to the backend, so there is no cross-origin setup. In
two terminals:

```
# in backend/
BINSIGHT_APP_ADDRESS=http://localhost:5173 BINSIGHT_DATA_DIRECTORY=../data \
  uv run uvicorn app.main:create_app --factory --port 8000

# in frontend/
npm run dev
```

Then open `http://localhost:5173`. `npm run e2e` starts both itself, with
the backend on an empty data directory.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
