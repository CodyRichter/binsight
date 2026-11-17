# 0013: The backend is built through the five flows before the frontend is wired

Status: Accepted

## Context

The build order had every step ship its backend, MCP tool and page
together. The frontend toolchain and design language are done, but there
is no backend yet. Building each flow on both sides at once means settling
the API shape, the history rules and the MCP layer while also building
pages against an API that keeps moving.

## Decision

- The backend is built first, in phases B1 to B10, until every request in
  flow 5 of [acceptance.md](../acceptance.md) passes through MCP tests.
- Each phase ships its services, routes, MCP tools and tests together. Only
  pages wait.
- The frontend is then wired to the finished API as its own stage, with
  the end-to-end tests for the five flows.
- Breadth after `v0.1.0` goes back to one step per feature, shipping both
  sides together.
- A backend feature folder may exist before its frontend folder. A frontend
  feature folder still needs its backend one.

## Why

- The API and generated types are complete before any page depends on
  them, so pages are written once.
- Flow 5 exercises every core action through MCP, so the backend is proven
  end to end without a browser.

## Cost

- The app cannot be used in a browser until the wiring stage.
- The end-to-end tests arrive with the wiring rather than with step 1.
- A backend mistake that only a page would reveal is found later.
