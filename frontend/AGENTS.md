# AGENTS.md (frontend)

Adds to the [root AGENTS.md](../AGENTS.md), which applies here in full.
Stack and layout are in [README.md](README.md).

## Check your work

Run `../scripts/check.sh`. For a faster loop while working, from
`frontend/`:

```
npm run lint
```

`npm run typecheck`, `npm run build` and `npm run e2e` are added with the
first code and join `scripts/check.sh` then. Lint rules are in
`eslint.config.mjs`. A React component's length is governed by the 150-line
file limit, not the 40-line function limit. For anything
visible, also open it at phone width in light and dark mode and say that you
did, or that you could not.

## Where code goes

- Files in `src/app/` arrange components and hold no logic, state or data
  fetching of their own.
- A feature's components and hooks live in its folder under `src/features/`.
  Something moves to `src/components/` only when a second feature uses it.
- A feature imports from another feature only what that feature exports from
  its index file.
- Every backend call goes through `src/lib/api/`. Components never call
  `fetch`.
- Server data is read and written only through React Query hooks. No
  fetching in `useEffect`.
- Shapes shared with the backend come from `src/types/api.generated.ts`,
  which is generated and never edited by hand. Do not redeclare them.

## Rules that come from the requirements

- Only a name is ever required. Never mark another field required, and never
  prompt, badge or score the user toward filling optional fields.
- Find, add, move and update each take two taps or two scans. Count them
  before calling a flow done.
- Design at phone width first, with touch targets large enough for one hand.
- Values are edited where they are shown. No separate edit pages or
  multi-step forms.
- Add, move and quantity changes update the screen immediately and go
  through the offline queue in `src/lib/offline/`, so they survive a dropped
  connection. They never show a blocking spinner.
- Reversible actions offer undo. Confirmation dialogs are only for actions
  that cannot be undone.
- Wherever an item appears, so do its full location path and when its bin
  was last checked.
- The `/l/[code]` path never changes. It is printed on labels.
- Labels are scanned with the phone's own camera and open in the browser. Do
  not assume a native app.

## React and TypeScript

- Components are server components unless they need interaction; add
  `'use client'` only then.
- No `any`. No non-null `!` assertions on data from the backend.
- State lives as low as it can. Reach for context only when three or more
  levels need it; there is no global store.
- Use Mantine components and theme values. Write custom CSS only when no
  Mantine prop does the job.
- Interactive things are real `button` and `a` elements, inputs have labels,
  and focus is visible.

## Do not

- Treat browser storage as the source of truth. It holds the offline queue,
  cached pages and small conveniences.
- Add a state library, a form library, a CSS framework or a second component
  library.
- Add loading skeletons, animations or empty-state illustrations that were
  not asked for.
