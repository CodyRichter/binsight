# Decisions

One short file per decision that shapes the project and would be expensive
to reverse. Each says what was decided, why, and what it costs.

A decision here is settled. To change one, add a new decision that replaces
it and mark the old one as replaced. Do not quietly work around one.

| No.  | Decision                                                  | Status   |
| ---- | --------------------------------------------------------- | -------- |
| 0001 | [SQLite is the only database](0001-sqlite-only.md)        | Accepted |
| 0002 | [One backend process, with MCP inside it](0002-single-process.md) | Accepted |
| 0003 | [Code is organized by feature, with one service layer](0003-feature-folders.md) | Accepted |
| 0004 | [Label addresses and codes are permanent](0004-permanent-labels.md) | Accepted |
| 0005 | [Files live on disk, not in the database](0005-files-on-disk.md) | Accepted |
| 0006 | [Frontend types are generated from the backend](0006-generated-api-types.md) | Accepted |
| 0007 | [Rules are enforced by tools, not prose](0007-enforce-with-tools.md) | Accepted |
