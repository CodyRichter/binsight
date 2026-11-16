# Design language

How Binsight looks, reads and is laid out. It applies to everything a person
sees. It is settled ([decision 0011](decisions/0011-design-language.md)): to
change a rule, change this document first, then the code.

Binsight is used standing at a shelf, phone in one hand, a bin in the other.
The interface borrows from that world: black storage totes with yellow lids,
white sticker labels, steel shelving. It should feel like a well-labeled
garage, not like a dashboard.

## The idea in four rules

1. **Yellow means do.** `accent` is the only filled color on a page and marks
   the one action most likely wanted. If two things are yellow, one is wrong.
2. **White means write.** `surface` is label stock. Fields, the add bar and
   sheets are white; the page behind them (`ground`) is not. If it is white,
   you can type on it or it is floating above the page.
3. **A code looks like its sticker.** A label code is always a code chip:
   mono, boxed, paper-white even in dark mode.
4. **Rows, not cards.** Content is full-width rows divided by a hairline.
   Nothing on the page is a rounded box with a shadow.

## Words on the page

The app explains itself by its layout, not by sentences. A screen holds the
owner's data and the controls to change it, and almost nothing else.

- Every piece of text is one of four things: the owner's data, a short name
  for that data ("Serial number"), a control's label, or a message about
  something that just happened. Text that is none of these is deleted.
- The test: cover the text. If the owner can still do and know everything
  they could before, it goes.
- Nothing describes the page or a section. No sentence under a title, no
  description under a section header, no caption under a button, no help
  text beside a control. If a control needs a sentence to be understood,
  rename it or redesign it.
- Nothing narrates a change. No "Saved", "Updated just now" or "New"
  markers. The screen changing is the confirmation; a toast appears only
  when there is something to undo or a refusal to report.
- No welcome text, tours, tips, or tooltips that carry information.
- A fact is said once per screen. A row does not repeat what the page title
  or section header already says.
- State numbers bare: "6 items", not "Total items: 6".
- The only full sentences allowed: a field's error, a dialog body, an empty
  state heading, and a single small line in settings where a consequence
  cannot be undone and cannot be guessed.

## Voice

Write the way you would label a bin: short, literal, no decoration.

- Use the [glossary](glossary.md)'s words and only those.
- Sentence case everywhere. No full stop on buttons, headings or
  one-sentence toasts.
- A button is a verb that names what happens: "Move", "Contents checked",
  "Mark missing". Never "OK", "Submit" or "Yes".
- A toast is the past tense of the button and names the thing: "Moved to
  Bin B-015".
- An error says what is wrong, then what to do: "No label has the code
  B-9999. Check the sticker and try again." No apology.
- Relative time in words: "3 weeks ago".
- Never nag. Nothing says "incomplete" or "needs attention". Optional fields
  are invisible until wanted.
- No exclamation marks, no emoji, no "successfully".

## Tokens

The Mantine theme in `frontend/src/lib/theme/` implements these values. Feature code uses theme keys
and never a raw color, size or radius. A new token is added here and to the
theme in the same change, before it is used.

### Color

| Token            | Light     | Dark      | Used for |
| ---------------- | --------- | --------- | -------- |
| `ground`         | `#eef0f1` | `#111315` | Page background. Rows, headers and bars sit directly on it. |
| `surface`        | `#ffffff` | `#1b1e21` | What you write on or what floats: fields, add bar, sheets, dialogs, menus. |
| `hover`          | `#e1e5e8` | `#262a2e` | Hover and pressed fill behind a row, icon button or menu item. |
| `ink`            | `#14171a` | `#eef0f1` | Primary text and icons. The rule under a section header. |
| `muted`          | `#55606a` | `#a3acb4` | Secondary text: paths, counts, placeholders, last checked. |
| `hairline`       | `#cfd4d8` | `#30353a` | 1px row separators. Carries no meaning. |
| `control-border` | `#7c8791` | `#6b757e` | 1.5px border of every control. |
| `accent`         | `#ffd21f` | `#ffd21f` | The one action color. A fill, never text on a light page. |
| `accent-hover`   | `#f2c200` | `#ffdd55` | Hover and pressed fill of an accent control. |
| `accent-edge`    | `#14171a` | `#ffd21f` | Border of an accent fill, so it stands out on a light page. |
| `on-accent`      | `#14171a` | `#14171a` | Text and icons on `accent`. |
| `highlight`      | `#fff1a8` | `#4d4200` | Marker pen: current navigation item, selected row or chip, matched search text. |
| `focus`          | `#14171a` | `#ffd21f` | The 2px keyboard focus ring, offset 2px. |
| `inverse`        | `#14171a` | `#2c3136` | Toast background, the selected segment, count badges. |
| `on-inverse`     | `#f2f4f5` | `#f2f4f5` | Text on `inverse`. |
| `label`          | `#ffffff` | `#e9ebe6` | Fill of a code chip. Stays paper-white in dark. |
| `on-label`       | `#14171a` | `#14171a` | Code text and border on `label`. |
| `danger`         | `#b3261e` | `#ff8a80` | Missing status, field errors, destructive menu items. Also the fill of the destructive dialog button. |
| `on-danger`      | `#ffffff` | `#14171a` | Text on a `danger` fill. |
| `lent`           | `#1f5fbf` | `#8ab4ff` | Lent out status. |
| `stale`          | `#8a5a00` | `#e3a857` | Last checked more than a year ago, or never. |
| `scrim`          | `rgba(20,23,26,0.45)` | `rgba(0,0,0,0.6)` | Dimmed page behind a sheet or dialog. |

- `highlight` shows where you are or what you picked. It never marks an
  action.
- `danger`, `lent` and `stale` always come with a word and an icon. Color
  alone never carries meaning. There is no green: things being fine is the
  default and shows nothing.
- Dark mode is the same design on a tote-black ground, not an inversion.
- No gradients, tinted panels, translucent or blurred layers, or colored
  side stripes on rows.

### Type

Two families, both bundled with the app and never fetched: Atkinson
Hyperlegible Next for the interface, chosen for reading at arm's length, and
Atkinson Hyperlegible Mono for label codes, where 0, O, 1 and I must not be
confused.

| Style              | Size / line | Weight | The only use |
| ------------------ | ----------- | ------ | ------------ |
| `text-title`       | 24 / 28     | 700    | The page title, once per page: the thing's own name. |
| `text-heading`     | 18 / 24     | 700    | Section headers, sheet and dialog titles. |
| `text-body-strong` | 16 / 24     | 650    | Item names in rows, button labels, the last path segment. |
| `text-body`        | 16 / 24     | 400    | Everything else, and everything typed. |
| `text-small`       | 14 / 20     | 400    | Paths, last checked, counts, tags, field errors. |
| `text-nav`         | 12 / 16     | 500    | Bottom navigation labels. |
| `code`             | 14 / 20     | 700    | A label code in a code chip (mono). |
| `code-lg`          | 22 / 32     | 700    | The code in the header of a labeled location (mono). |

- A screen shows at most four sizes: 24 once, 18, 16 and 14. A row uses
  exactly two styles: `text-body-strong` for the name and `text-small` for
  everything under it.
- Pick a style by what the text is, not by how it looks. The same kind of
  text is the same style on every page. No one-off sizes, weights or colors.
- Hierarchy comes from weight and `muted`, not from size jumps.
- Checkbox and switch labels are `text-body`. Segment and chip labels are
  `text-small`, set in 650 while chosen; that is the only weight a state changes.
- Mono is for label codes only. Not for numbers, dates or serial numbers.
- No all-caps labels, letter-spaced eyebrows or numbered section markers.
- Counts and quantities use tabular figures.

### Space, shape and size

| Token                 | Value | Used for |
| --------------------- | ----- | -------- |
| `space-xs`            | 4px   | Icon to its text; a name to its path. |
| `space-sm`            | 8px   | Between sibling controls; row vertical padding. |
| `space-md`            | 12px  | Inside a field; thumbnail to its text. |
| `space-lg`            | 16px  | The page gutter, at every width. |
| `space-xl`            | 24px  | Above a section header; one tree indent; dialog padding. |
| `space-2xl`           | 32px  | Between unrelated blocks on a settings or item page. |
| `radius-sm`           | 2px   | Stickers: code chips, status badges, tags, checkboxes. |
| `radius-md`           | 6px   | Controls: buttons, fields, chips, thumbnails, menus, toasts. |
| `radius-lg`           | 12px  | Sheets and dialogs only. |
| `touch-min`           | 48px  | Smallest height and width of anything tappable. |
| `row-min`             | 64px  | Smallest height of an item row. |
| `bar-height`          | 56px  | Top bar. |
| `nav-height`          | 64px  | Bottom bar on a phone. |
| `content-max`         | 720px | Widest the content column gets. |
| `nav-width`           | 264px | Side navigation on wide screens. |
| `shadow-overlay`      | `0 8px 24px` at 18% ink (50% black in dark) | Sheets, dialogs, menus, toasts. |

- The page is flat. Only things that float cast a shadow. A thing has a
  border or a shadow, never both for decoration. Never a box in a box.
- No pills and no circles.
- Tappable things keep at least `space-sm` between them. The most used
  actions sit in the lower half of a phone screen.

### Icons and motion

- Tabler Icons, outline, stroke 1.75 (set once in the theme): 24px in bars
  and buttons, 20px in menus and tree rows, 16px beside `text-small`.
- An icon repeats a word that is also on screen. The exceptions, which may
  stand alone with an `aria-label`: Back, Search, Scan, Add, Close, More,
  Camera, and a stepper's plus and minus.
- Icons are `ink`, `muted`, or the color of the status they sit in.
- Location type icons: site `home` or `building-warehouse`, room `door`,
  furniture `armchair`, shelf `layout-rows`, bin `box`, drawer `archive`,
  box `package`.
- Nothing moves for decoration. State changes fade in 120ms; sheets and
  toasts slide 200ms in, 150ms out, and not at all with reduced motion set.

### States

Hover is a `hover` fill. Keyboard focus is the `focus` ring. Selected is a
`highlight` fill. Disabled (rare) is `ground` fill, `muted` text. Error is a
`danger` border and one sentence. Loading keeps showing what was there:
changes appear at once and roll back with a toast if refused.

## Layout

### The frame

Two arrangements, switched at Mantine's `md` breakpoint (62em). Design the
narrow one first.

| Region     | Under 62em | 62em and up |
| ---------- | ---------- | ----------- |
| Top bar    | Back, search field, Scan | Search field (max 520px), then Scan and Add buttons at the right |
| Navigation | Bottom bar: Home, Views, Add, Inbox, Settings | Side navigation: Home, Inbox, each view with its count, Settings last |
| Content    | Full width, rows edge to edge | One column, left-aligned, at most `content-max` |
| Add        | Center of the bottom bar, opens the add sheet | Button in the top bar, opens the same content as a modal |
| Toast      | Above the bottom bar | Bottom left of the content column |

- The top bar holds only those things. A page's own actions live in its
  page header.
- The bottom bar has exactly five slots. Add is its only `accent` item. The
  current destination gets a `highlight` block behind its icon; pages below
  a destination keep their parent lit.
- No title bar, footer, floating action button or right-hand panel. Bars
  are `ground` with a hairline edge, never shadowed or blurred.
- A wide screen shows the same content with more room. It gets no extra
  columns, cards, panels or features.
- Full-width components (page header, list section and its rows, value
  rows, empty state) own the gutter. A page pads everything else with
  `space-lg` (`px="lg"`).

### Page templates

Every page is one of six templates.

| Template | Structure, top to bottom | In the frame |
| -------- | ------------------------ | ------------ |
| Browse   | Page header, add bar (locations only), then list sections of location rows and item rows | Yes |
| List     | Page header (title and count), a row of filter chips, one list of item rows or an empty state | Yes |
| Record   | Page header with a large thumbnail, then list sections of name and value pairs, each edited in place, then history | Yes |
| Task     | Close button and task name, the work area, one primary button pinned to the bottom | No: full screen, so nothing is tapped by mistake |
| Settings | Page header, then list sections of rows: a name, a current value, one control | Yes |
| Gate     | The name Binsight, one or two fields, one primary button, in a 360px column | No |

| Path              | Template | Lit navigation item |
| ----------------- | -------- | ------------------- |
| `/`               | Browse   | Home     |
| `/l/{code}`       | Browse   | Home     |
| `/locations/{id}` | Browse   | Home     |
| `/items/{id}`     | Record   | Home     |
| `/search`         | List     | None     |
| `/views`          | Browse   | Views    |
| `/views/{view}`   | List     | Views    |
| `/inbox`          | List     | Inbox    |
| `/scan`           | Task     | None     |
| `/settings`       | Settings | Settings |
| `/login`          | Gate     | None     |

Check mode is a Task that opens over a location's page and has no address.

`/design` exists only in development builds and is outside the templates:
it renders every token and component, in the frame, for checking the
design by eye.

`/views` is where the bottom bar's Views item goes: every view as a row
with its count.

### Where things go on a page

1. Identity: the page header says what this is and where it is.
2. The fastest action: on a location, the add bar.
3. Contents, in list sections. Locations inside come before items.
4. History and rarely used details.

Actions on the page's subject live in the page header. Actions on one row
live on that row or on its page. Actions on many rows appear in a bar that
replaces the bottom navigation while rows are selected. One decision opens
a sheet. Something that cannot be undone opens a dialog. Everything else
happens in place and reports with a toast.

### Adding to the layout

- A new page picks a template and adds a row here and to the README page
  table. If none fits, propose a seventh template here first.
- A new destination does not go in the bottom bar. It becomes a view, a
  section of settings, or an action in a page header.
- A new component is added here first, with its rules, built only from
  existing tokens.
- A new status, color meaning or text style is a change to this document,
  not to a page.

## Components

Names in the first group are Mantine components used as themed, with no
wrapper. The second group are small Binsight components built from Mantine
parts; they live in `frontend/src/components/`.

### Mantine, themed

**Button** (`Button`). One size, `touch-min` high.

| Kind    | Looks like | Use for |
| ------- | ---------- | ------- |
| Primary | `accent` fill, `accent-edge` border | The most likely action. At most one visible, not counting Add in the navigation. |
| Default | `surface` fill, `control-border` | Every other action. |
| Subtle  | Underlined `ink` text | A lesser action beside a default button; links in text. |
| Danger  | `danger` fill | The confirming button in a dialog. Nowhere else. |

An icon before the text is optional. No blocking spinner for add, move or
quantity. Prefer an enabled button that explains a refusal in a toast over a
disabled one.

**Icon button** (`ActionIcon`). `touch-min` square, 24px icon, only for the
icons listed under Icons. Plain in bars and rows, bordered beside default
buttons, `accent` only for Add.

**Menu** (`Menu`). Opens beside its More button at every width. Holds what
did not make the two header buttons. Verb-first rows with a 20px icon. A destructive
row is `danger` (`color="danger"`), last, below a rule. No nesting, no toggles, seven rows at
most.

**Text field** (`TextInput`, `Textarea`). `surface` fill, `touch-min` high,
`text-body`. The name sits above in bold `text-small`, one to three words. A
placeholder is an example or "Optional". Nothing is marked required. The
line under a field exists only for an error. Search is this field with a
leading icon; batch add is its multi-line form, one name per line.

**Checkbox** (`Checkbox`). 28px box in a `touch-min` target; ticked is
`accent`. For check mode, where it replaces the thumbnail and the whole row
is the target, and for bulk selection, where the row also takes `highlight`.
Settings that are on or off use `Switch`.

**Segmented control** (`SegmentedControl`). Two or three views of the same
list, each with its count: "Here" and "Everything inside" on a location. The
chosen segment is `inverse`, not `accent`. It never navigates.

**Filter chip** (`Chip`). 40px high. Pressed is `highlight` with an `ink`
border and shows its value. Chips sit in one row under a List page's header
and scroll sideways on a phone.

**Tag** (`Badge`, outline). `text-small`, `muted`, hairline box,
`radius-sm`. Never colored. Tapping one searches for it.

**Toast** (`Notifications`). `inverse` background, action in `accent`, one
at a time. Every reversible action shows one with Undo for 6 seconds; this
replaces "Are you sure?". A refusal puts the screen back, says what is now
true, offers Retry, and stays until dismissed. No titles, ticks or stacking.

**Dialog** (`Modal`). Only for what cannot be undone: emptying deleted items
for good, deleting blank labels, revoking an MCP credential, restoring a
backup. The title is the question and names the thing and the number. Two
verb buttons, the safe one first and focused: "Keep them", "Delete forever".
The safe button carries `data-autofocus`.

### Binsight components

**Editable text** (`EditableText`). Editing in place: a value shown on a
page is edited where it is shown: plain text at rest, `hover` fill on hover,
a focused field on tap. Enter or leaving saves, Escape cancels. No Save
button. An empty optional value shows as a `muted` invitation ("Add a
summary") only on the thing's own page.

**Sheet** (`Sheet`: a Mantine `Drawer` from the bottom, a `Modal` from `md`
up). One title, one choice. Picking a row acts and closes it. The move sheet
lists recently used locations first. A sheet never opens another sheet and
never holds more than one field.

**Path.** `text-small`, `muted`, chevron separators, last segment bold
`ink`. Never truncated; it wraps. A page header shows the parents only, each
segment a link. A row shows the full path to the home location as plain
text, since the whole row opens the item. A labeled
location's segment reads "Bin B-014" in the same style, with no code chip.

**Code chip.** `label` fill, `on-label` text and 1.5px border, `radius-sm`,
mono. Regular beside a location's name; large once, in a labeled location's
page header. A blank label is dashed with no fill. Shows the code exactly as
printed. Only for label codes.

**Checked stamp.** An icon and "Checked 3 weeks ago" in `text-small`. Fresh:
tick, `muted`. Over a year, or never: clock, `stale`, bold. In every
location's page header, and in search and view rows only when stale. It
informs and never asks: no counts, no "overdue", not tappable.

**Status badge.** Icon, word, 1.5px outline in one color, never filled. In
place shows nothing.

| Status | Color | Icon | Words |
| ------ | ----- | ---- | ----- |
| In use | `ink` | `arrows-move` | In use |
| Lent out | `lent` | `user` | Lent to {name} |
| Missing | `danger` | `zoom-question` | Missing |
| Sold, given away, thrown away | `muted`, dashed | `archive` | Sold / Given away / Thrown away |

No other badges exist. Nothing is badged "New" or "Incomplete".

**Quantity stepper.** 44px minus and plus either side of a tabular number.
On the item page always; in a row only when the quantity is above one. A
burst of taps is one change, one history entry, one Undo. Tapping the number
types an exact value. Minus stops at 1. No "low" coloring.

**Thumbnail.** A square, `radius-md`, hairline border: 48px in rows, 96px on
an item page. Without a photo it is `surface` with a `muted` icon: `package`
for an item, the location type's icon for a location. It is not a prompt: no
plus sign, no "Add photo".

**Item row.** Thumbnail, then the name over a line holding the path and any
status badge, then the quantity stepper if shown. The whole row opens the
item; no chevron. Inside a location's own contents the path is left out.
Full width on `ground`, hairline below, at least `row-min` high. Names wrap;
nothing is cut with an ellipsis. Matched search text is marked with
`highlight`. No swipe gestures.

**Location row.** Expand toggle (only with children), type icon, name, code
chip if labeled, count of every item inside in `muted` at the right.
`touch-min` high. Each level indents `space-xl`. The toggle expands in
place; the rest of the row opens the location. No summary in the tree.

**Value row.** A name and its value, for the Record and Settings templates.
The name in bold `text-small` above the value; the value as editable text
or one control. Full width, hairline below, at least `touch-min` high.

**List section.** A `text-heading` noun ("Items"), its count in `muted`, at
most one subtle action, over a 1px `ink` rule. `space-xl` above. Sections
are separated by space and the rule, never boxes. An empty section is left
out, unless it is the page's main list.

**Add bar.** The quick-add field, and the only field with an `accent`
underline. At the top of a location's contents and in the add sheet, nowhere
else. It states the destination: "to" and the code chip or name, or "to
Inbox"; tapping that changes it. Enter adds, clears and keeps focus. A
camera button adds by photo; "Add several" swaps in the multi-line field. A
likely duplicate appears as a row beneath offering "Add to existing" and
never blocks Enter.

**Page header.** In order, leaving out any line with nothing in it: the
parent path; the title and large code chip; the summary, edited in place;
the checked stamp and counts; at most two buttons and a More icon button. No
eyebrow above the title. It scrolls with the page.

**Empty state.** A `text-heading` statement of fact and at most one button,
left-aligned: "Nothing matches "multimeter"", "This bin is empty", "Nothing
is missing". A second sentence only when it adds a fact. No illustration or
large icon. Loading is not an empty state.

## Building it with Mantine

The theme in `frontend/src/lib/theme/` sets all of this once, so pages
never style anything themselves.

| Mantine setting | Value |
| --------------- | ----- |
| `fontFamily`, `fontFamilyMonospace` | The two families, bundled |
| `headings` | `h1` is `text-title`, `h2` is `text-heading`. No others. |
| `fontSizes` | `xs` 12, `sm` 14, `md` 16, `lg` 18, `xl` 24 |
| `spacing` | `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `2xl` 32 |
| `radius` | `sm` 2, `md` 6, `lg` 12; `defaultRadius` is `md` |
| `primaryColor` | A ten-shade yellow with `accent` at index 5 and `accent-hover` at 6; `primaryShade` 5 |
| `autoContrast` | On, so text on `accent` is dark |
| `shadows` | Every key is `shadow-overlay` |
| `cssVariablesResolver` | Sets the color tokens per color scheme, and points Mantine's body, text and dimmed colors at `ground`, `ink` and `muted` |
| `components` | Defaults so no page passes them: buttons and inputs 48px high; `ActionIcon` 48px; `Badge` outline, `radius-sm`, no upper case; `Modal` and `Drawer` `radius-lg`, no blur; `Notifications` bottom, one at a time, 6 seconds |

In feature code:

- Use theme keys: `c="dimmed"`, `p="lg"`, `radius="sm"`. Text is `Title`
  (order 1 or 2) or `Text` with `size="md"` or `size="sm"`.
- Do not use `Paper` with a shadow, `Loader` in content, or `Popover` for
  explanation.
- Everything else here with no exceptions is enforced by
  `frontend/eslint.config.mjs`: raw colors and pixel sizes, styling and
  help-text props, sizes on buttons and inputs, `color`, variants, banned
  components, icon stroke, and CSS outside `src/components/`.
