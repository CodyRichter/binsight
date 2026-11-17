# AGENTS.md (frontend)

Adds to the [root AGENTS.md](../AGENTS.md), which applies here in full.
The stack is in [README.md](README.md).

## Check your work

Run `../scripts/check.sh`. For a faster loop while working, from
`frontend/`:

```
npm run lint
npm run format
```

`npm run typecheck`, `npm test` and `npm run build` are part of
`scripts/check.sh`. `npm run dev` serves the app; `/design` shows every
component and token. `npm run e2e` runs the Playwright tests, in continuous
integration rather than the check script. There are no screenshot
comparisons; they broke on every intended visual change. Lint rules are in `eslint.config.mjs`. A React
component's length is governed by the 150-line file limit, not the 40-line
function limit.

For anything visible, also open it at phone width in light and dark mode
and say that you did, or that you could not.

## How it looks

Read [docs/design-language.md](../docs/design-language.md) before changing
anything visible. Every page is one of its templates and every piece of
interface is one of its components, built from its tokens. If what you need
is not there, stop and ask; do not invent it on the page.

## Where code goes

- Files in `src/pages/` arrange components and hold no logic, state or data
  fetching of their own. Each is listed once in the route table.
- A feature's components and hooks live in its folder under `src/features/`,
  at most one folder deep. Something moves to `src/components/` only when a
  second feature uses it. The design language's components are the
  exception: they live in `src/components/` from the start.
- The theme is `src/lib/theme/`, and `tokens.ts` there is the only file
  with a color value.
- A feature imports from another feature only what that feature exports from
  its index file, and reaches it through the `@/` alias.
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
- Add, move and quantity changes update the screen immediately, and put it
  back with a message if the backend refuses. They never show a blocking
  spinner.
- Reversible actions offer undo. Confirmation dialogs are only for actions
  that cannot be undone.
- Wherever an item appears, so does its full location path.
- Labels are scanned with the phone's own camera and open in the browser. Do
  not assume a native app.

## React and TypeScript

- There is no server rendering. Everything runs in the browser.
- No `any`. No non-null `!` assertions on data from the backend.
- State lives as low as it can. Reach for context only when three or more
  levels need it; there is no global store.
- Use Mantine components and theme values. Write custom CSS only when no
  Mantine prop does the job.
- Interactive things are real `button` and `a` elements, inputs have labels,
  and focus is visible.

## Do not

- Treat browser storage as the source of truth. It holds small conveniences,
  such as the last location used.
- Add a service worker, an offline queue or cached pages. Working without a
  connection is under LATER in the requirements.
- Add a state library, a form library, a CSS framework or a second component
  library.
- Add loading skeletons, animations or empty-state illustrations that were
  not asked for.
