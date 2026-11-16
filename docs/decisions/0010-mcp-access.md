# 0010: Claude reaches the MCP server from local clients

Status: Accepted

## Context

Binsight sits behind a home lab's access layer and is not exposed to the
internet. Claude clients that run in the cloud, such as claude.ai and the
phone app, connect to MCP servers from the internet and expect OAuth.

## Decision

- The supported clients are Claude Code and Claude Desktop, on a device
  that can already reach the app.
- The MCP server speaks streamable HTTP at `/mcp`.
- A client authenticates by sending an MCP credential as a bearer token.
  There is no OAuth.
- MCP credentials are created and revoked on the settings page. A request
  with a session cookie and no bearer token is refused at `/mcp`.

## Why

- Nothing new is exposed, so the security stance in
  [SECURITY.md](../../SECURITY.md) holds without exceptions.
- A bearer token is the simplest credential both clients accept, and
  revoking it is deleting one row.

## Cost

- Claude cannot be asked from the phone app or claude.ai. That is listed
  under LATER in the requirements, and would need a new decision.
- The credential is a long-lived secret on each client device.
