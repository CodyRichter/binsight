# 0003: Code is organized by feature, with one service layer

Status: Accepted

## Context

The app has around a dozen features that map onto sections of the
requirements. Two front doors reach them: the web API and the MCP tools.
The project is expected to be worked on heavily by coding agents, which do
best when the place for a change is obvious.

## Decision

- The backend and frontend each have a `features/` folder, with one folder
  per feature and the same names on both sides. A folder is created by the
  step that builds the feature, not before.
- Each backend feature has three files: `service.py` for its public
  functions, `schemas.py` for data shapes, and `routes.py` for endpoints.
- When `service.py` nears the file size limit, behavior moves into further
  files in the same folder, each named for what it does (`quick_add.py`).
  `service.py` stays the only file anything outside the feature calls.
- Routes and MCP tools are thin and call the same service functions.
- Database tables are defined centrally in `backend/app/models/`, because
  they relate across features.
- A feature uses another feature only through its public functions.

## Why

- Everything about a feature is in one predictable place on each side.
- Behavior has one home, so the app and Claude cannot behave differently.
- A fixed file layout leaves little room to invent structure.

## Cost

- Some features are small and their three files will be short.
- A large feature's `service.py` becomes a list of short functions that
  pass the work on to its other files.
- Behavior that spans features needs a deliberate owner. When unsure, the
  feature whose data is being changed owns it.
- Central models mean a feature's tables are not in its own folder.
