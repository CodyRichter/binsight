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
| 0004 | [Label addresses and codes are permanent](0004-permanent-labels.md) | Accepted, amended by 0021 |
| 0005 | [Files live on disk, not in the database](0005-files-on-disk.md) | Accepted |
| 0006 | [Frontend types are generated from the backend](0006-generated-api-types.md) | Accepted |
| 0007 | [Rules are enforced by tools, not prose](0007-enforce-with-tools.md) | Accepted |
| 0008 | [The frontend is a client-only app served by the backend](0008-frontend-served-by-backend.md) | Accepted |
| 0009 | [One transaction per action, with history recorded inside it](0009-transactions-and-history.md) | Accepted |
| 0010 | [Claude reaches the MCP server from local clients](0010-mcp-access.md) | Accepted |
| 0011 | [The interface follows one design language](0011-design-language.md) | Accepted |
| 0012 | [The frame has three widths and one column, and text starts at 14px](0012-three-width-frame.md) | Accepted, amended by 0023 |
| 0013 | [The backend is built through the five flows before the frontend is wired](0013-backend-first.md) | Replaced by 0014 |
| 0014 | [Each backend phase is followed by its frontend phase](0014-paired-phases.md) | Accepted, amended by 0015 |
| 0015 | [A template's specimen is deleted when its real page lands](0015-specimens-end-with-their-page.md) | Accepted |
| 0016 | [Search scores names in Python, with no index](0016-search-in-python.md) | Accepted |
| 0017 | [The in-app scanner reads QR codes with the BarcodeDetector ponyfill](0017-scanning-in-the-browser.md) | Accepted |
| 0018 | [Deleting and merging locations are run from the locations folder, outside its service](0018-location-housekeeping-owner.md) | Accepted |
| 0019 | [A location's icon is a Tabler icon name, loaded when shown](0019-location-icons-from-tabler.md) | Accepted |
| 0020 | [Location contents are not checked](0020-no-checks.md) | Accepted |
| 0021 | [A location is known by its code](0021-location-codes.md) | Accepted |
| 0022 | [Accounts with three fixed roles, and reading without signing in](0022-accounts-and-roles.md) | Accepted |
| 0023 | [Wide screens get a location pane, and a mouse gets denser controls](0023-desktop-panes-and-mouse-density.md) | Accepted |
| 0024 | [The selection bar floats over the content column](0024-floating-selection-bar.md) | Accepted |
| 0025 | [Claude sends photos and files through an upload link](0025-mcp-uploads-by-link.md) | Accepted |
