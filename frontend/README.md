# Binsight frontend

The Next.js web app. Phone first, installable to the home screen, and usable
on a weak connection.

> **Status: foundations.** Tooling is set up; no application code yet. This describes the intended stack and
> layout.

## Tech stack

| Purpose            | Choice                                              |
| ------------------ | --------------------------------------------------- |
| Runtime            | Node 24                                             |
| Framework          | Next.js (App Router) with React and TypeScript      |
| Interface library  | Mantine, with Tabler icons                          |
| Server data        | TanStack Query (React Query)                        |
| Installable app    | Web app manifest and a service worker               |
| QR scanning        | The phone's own camera for labels; an in-browser scanner for scan-to-move |
| End-to-end tests   | Playwright                                          |
| Lint               | ESLint                                              |

## Layout

```
frontend/
├── public/              Icons and the web app manifest
├── src/
│   ├── app/             Pages. Thin: they arrange feature components.
│   ├── features/        One folder per feature: its components and hooks
│   ├── components/      Shared interface pieces used by several features
│   ├── lib/
│   │   ├── api/         The one client used to call the backend
│   │   └── offline/     Cached pages and the queue of unsent changes
│   ├── styles/          Theme, including dark mode
│   └── types/           Shared data shapes
└── e2e/                 End-to-end tests, one per core flow
```

Feature folders use the same names as the backend. The list of features and
pages is in the [root README](../README.md#features).

## What shapes this app

- **Phone first.** Most use is one-handed, standing at a shelf. Every screen
  is designed at phone width first, with large touch targets.
- **Two taps.** Find, add, move and update each take two taps or two scans.
- **Edit in place.** Lists and item pages are edited inline. There are no
  separate edit forms.
- **Works on bad signal.** Recently viewed bins stay readable. Adds, moves
  and quantity changes are queued and sent when the connection returns.
- **`/l/[code]` is permanent.** It is the address printed on every label.

## Working here

Rules for contributors and agents are in [AGENTS.md](AGENTS.md).
