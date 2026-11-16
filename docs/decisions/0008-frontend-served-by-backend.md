# 0008: The frontend is a client-only app served by the backend

Status: Accepted

## Context

The requirements ask for one service. The app is used signed in, on a home
network, and almost every screen is edited in place, so there is little for
a server to render ahead of time. A Next.js server would be a second program
in the container, in front of or behind the backend.

## Decision

- The frontend is a client-only React app built with Vite into static
  files. There is no Node program at runtime.
- The backend serves those files. Paths under `/api` and `/mcp` are the
  backend's own; every other path returns the frontend, which shows the
  page for that path.
- The label address `/l/{code}` is one of those frontend pages.
- The container image is built in two stages: Node builds the files, and
  the final image holds Python and the built files only.

## Why

- One process and one port, which is what
  [decision 0002](0002-single-process.md) already promised.
- The MCP connection reaches the backend directly, with nothing in between
  to buffer or time it out.
- Sign-in is one cookie checked in one place.

## Cost

- No server rendering. The first load of a page fetches the app, then its
  data.
- While developing, Vite's own server runs beside the backend and passes
  `/api` through to it. That is a development convenience, not a deployment
  shape.
- A signed-out visitor still receives the app's files. They hold no data.
