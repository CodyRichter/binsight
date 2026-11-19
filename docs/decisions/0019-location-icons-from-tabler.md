# 0019: A location's icon is a Tabler icon name, loaded when shown

Status: Accepted

## Context

Seven type icons make every room a door and every piece of furniture an
armchair. The owner wants to pick a fitting icon for each location from
the whole Tabler outline set (about 5,500 icons), which the app already
draws all its icons from. Bundling every icon, or the full metadata file
(2 MB), into the app would make every page slower for a choice made once
per location.

## Decision

- A location stores its icon as Tabler's kebab-case name (`fridge`,
  `tools-kitchen-2`), or nothing for its type's icon. The backend checks
  only the name's shape; it keeps no list of icons.
- The build writes each outline icon's drawing to its own small file,
  `/icons/{name}.json`, from `@tabler/icons`. The frontend fetches one the
  first time it is on screen and draws it with Tabler's own component
  factory. Until then, and for a name Tabler no longer has, the type's
  icon shows. Tabler's `dynamic-imports` map was tried first: its 6,500
  entries put about 200 KB (gzipped) into the code every page loads.
- The picker searches an index of outline icon names, categories and tags,
  trimmed at build time from `@tabler/icons/icons.json` by a Vite plugin
  and loaded only when the picker opens.

## Why

- One icon set across the app, with no artwork of our own to draw or keep.
- A page pays only for the icons on it; the index costs nothing until the
  picker opens.
- Nothing has to be regenerated or kept in step by hand when Tabler is
  upgraded.

## Cost

- The build writes one file per icon, about 5,500 small files (1.3 MB) in
  the image.
- An upgrade that renames or removes an icon quietly turns a chosen icon
  back into its type's icon. Upgrades of `@tabler/icons-react` are checked
  for that in their changelog.
- `@tabler/icons`, already installed as a dependency of
  `@tabler/icons-react`, becomes a direct dependency at the same version.
