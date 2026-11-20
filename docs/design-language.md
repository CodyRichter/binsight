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
   On a location's page that thing is the add bar, so its header buttons are
   default buttons. Add in the navigation does not count.
2. **White means write.** `surface` is label stock. Fields, the add bar and
   sheets are white; the page behind them (`ground`) is not. If it is white,
   you can type on it or it is floating above the page.
3. **A code looks like its sticker.** A location's code is always a code chip:
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
- A button is a verb that names what happens: "Move", "Mark found",
  "Mark missing". Never "OK", "Submit" or "Yes".
- A toast is the past tense of the button and names the thing: "Moved to
  Tools".
- An error says what is wrong, then what to do: "No location has the code
  ZZZ-999. Check the sticker and try again." No apology.
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
| `hover`          | `#e1e5e8` | `#33393f` | Hover and pressed fill behind a row, icon button or menu item. |
| `ink`            | `#14171a` | `#eef0f1` | Primary text and icons. The rule under a section header. |
| `muted`          | `#55606a` | `#a3acb4` | Secondary text: paths, counts, placeholders. |
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
| `scrim`          | `rgba(20,23,26,0.45)` | `rgba(0,0,0,0.6)` | Dimmed page behind a sheet or dialog. |

- `highlight` shows where you are or what you picked. It never marks an
  action.
- `danger` and `lent` always come with a word and an icon. Color
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

Sizes are in px at the browser's default text size. The theme sets them in
rem (px ÷ 16), so they follow the owner's own text size setting.

| Style              | Size / line | Weight | The only use |
| ------------------ | ----------- | ------ | ------------ |
| `text-title`       | 24 / 28     | 700    | The page title, once per page: the thing's own name. |
| `text-heading`     | 18 / 24     | 700    | Section headers, sheet and dialog titles, the task name, Binsight in the side navigation. |
| `text-body-strong` | 16 / 24     | 650    | Item names in rows, button labels, the current navigation entry. |
| `text-body`        | 16 / 24     | 400    | Everything else, and everything typed. |
| `text-small`       | 14 / 20     | 400    | Paths, counts, tags, field errors, side navigation section headers (650). |
| `text-nav`         | 14 / 16     | 500    | Bottom bar labels and its count badge. Nowhere else. |
| `code`             | 14 / 20     | 700    | A label code in a code chip (mono). |
| `code-lg`          | 22 / 32     | 700    | The code in the header of a location's page (mono). |

- 14px is the smallest text anywhere.
- A screen shows at most four sizes: 24 once, 18, 16 and 14. A row uses
  exactly two styles: `text-body-strong` for the name and `text-small` for
  everything under it.
- Every style sets size, line height and weight together. Nothing sets a
  font size alone, and a component takes a style, never a size.
- Weights in use: 400, 650 and 700, and 500 for `text-nav` only.
- Every count is `text-small`, `muted`, tabular: in section headers, tree
  rows, page headers and the side navigation.
- The last segment of a path keeps `text-small`'s size and takes
  `text-body-strong`'s weight in `ink`: it answers "where is it?".
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
| `space-xs`            | 4px   | Icon to its text; lines of one group: header lines, a row's name and path, a value row's name and value. |
| `space-sm`            | 8px   | Between sibling controls; the add bar and its action row; row vertical padding. |
| `space-md`            | 12px  | Inside a field; thumbnail to its text. |
| `space-lg`            | 16px  | The page gutter, at every width; between one group and the next: header lines and buttons, the blocks of a page lead, a list with no header and what is above it. |
| `space-xl`            | 24px  | Above a section header; one tree indent; dialog padding. |
| `space-2xl`           | 32px  | Below the last block of a page. |
| `radius-sm`           | 2px   | Stickers: code chips, status badges, tags, checkboxes. |
| `radius-md`           | 6px   | Controls: buttons, fields, chips, thumbnails, menus, toasts. |
| `radius-lg`           | 12px  | Sheets and dialogs only. |
| `touch-min`           | 48px  | Smallest height and width of anything tappable. |
| `row-min`             | 64px  | Smallest height of an item row. |
| `bar-height`          | 56px  | Top bar, task frame header, and add bar. |
| `nav-height`          | 64px  | Bottom bar on a phone. |
| `content-max`         | 720px | Widest the content column gets. |
| `nav-width`           | 264px | Side navigation on wide screens. |
| `gate-width`          | 360px | The Gate's column. |
| `shadow-overlay`      | `0 8px 24px` at 18% ink (50% black in dark) | Sheets, dialogs, menus, toasts. |

- The page is flat. Only things that float cast a shadow. A thing has a
  border or a shadow, never both for decoration. Never a box in a box.
- No pills and no circles.
- Tappable things keep at least `space-sm` between them. The most used
  actions sit in the lower half of a phone screen.
- A control drawn smaller than `touch-min` (segmented control, filter chip,
  stepper button, and controls inside a `bar-height` bar) keeps its drawn
  size, and its tap area grows to `touch-min` in both directions.

### Vertical rhythm

Five intervals, used the same way on every page. Components own all of
them: a page arranges components and sets no spacing of its own.

| Interval | Token | Between |
| -------- | ----- | ------- |
| Tight   | `space-xs` | Lines of one group: path, title, summary, stamp and counts in a page header; a row's name and path; a value row's name and value |
| Sibling | `space-sm` | Controls side by side; the add bar and its action row |
| Group   | `space-lg` | The top bar and the first line; the page header's lines and its buttons; each block of the page lead and the next; a list with no header and what is above it |
| Section | `space-xl` | Above every section header, on every page |
| End     | `space-2xl` | Below the last block of a page, in the frame and in the task frame's work area |

- A list with no header has a hairline above its first row, so it has a top
  edge.

- Editable text keeps a `touch-min` tap area, but takes only its line
  height in the layout. Editable and plain text start at the same left edge.
- On a 375 by 667 phone in a browser, a location's page shows its header
  buttons and the whole add bar without scrolling when its title and path
  each fit one line. Its page header is then at most 200px tall.

At phone width, a location's page with a one-line title and path measures:

| Block | Height | Ends at |
| ----- | ------ | ------- |
| Top bar | 56 | 56 |
| Top space | 16 | 72 |
| Path, title with chip, summary, stamp, 4 apart | 20, 36, 24, 20 | 184 |
| Space, buttons | 16, 48 | 248 |
| Space, rule, space, add bar | 16, 1, 16, 56 | 337 |
| Space, add actions | 8, 48 | 393 |
| Section header (24 space, 48 row, rule) | 73 | 466 |

Its page header is 192px. An item row with a path on one line is `row-min`
(8, 24, 4, 20, 8) plus its hairline; a location row is `touch-min`; a text
value row is 64px (8, 20, 4, 24, 8) plus its hairline, and one with its name
beside the value is `touch-min`.

### Icons and motion

- Tabler Icons, outline, stroke 1.75 (set once in the theme): 24px in bars
  and buttons, 20px in menus and tree rows, 16px beside `text-small`.
- An icon repeats a word that is also on screen. The exceptions, which may
  stand alone with an `aria-label`: Back, Search, Scan, Add, Close, More,
  Camera, Move (on an item row), Remove link (on a linked item's row), and
  a stepper's plus and minus.
- Icons are `ink`, `muted`, or the color of the status they sit in.
- Location type icons: site `home` or `building-warehouse`, room `door`,
  furniture `armchair`, shelf `layout-rows`, bin `box`, drawer `archive`,
  box `package`.
- A location with a chosen icon shows it wherever its type icon would
  show, at the same size and color. The chosen icon is any Tabler outline
  icon ([decision 0019](decisions/0019-location-icons-from-tabler.md)).
- Nothing moves for decoration. State changes fade in 120ms; sheets and
  toasts slide 200ms in, 150ms out, and not at all with reduced motion set.

### States

Hover is a `hover` fill. Keyboard focus is the `focus` ring. Selected is a
`highlight` fill. Disabled (rare) is `ground` fill, `muted` text. Error is a
`danger` border and one sentence. Loading keeps showing what was there:
changes appear at once and roll back with a toast if refused.

## Layout

### The frame

Three widths and one content column. Design the narrow one first.

| Region          | Under 48em | 48em to 62em | 62em and up |
| --------------- | ---------- | ------------ | ----------- |
| Navigation      | Bottom bar | Bottom bar | Side navigation, full height |
| Content column  | Full width | `content-max`, centered | `content-max`, left-aligned beside the navigation |
| Top bar         | Back, search field, Scan, full width | The same, held to the column | Search field, Scan and Add, held to the column, right of the navigation |
| Bottom bar slots | Full width | Held to the column, centered | None |
| Add             | Center of the bottom bar, opens the add sheet | The same | Button in the top bar, opens the same content as a modal |
| Toast           | Above the bottom bar, in the column | The same | Bottom of the column |

- The column is the only horizontal measure. The top bar's contents, the
  page, the toast and the bottom bar's slots share its edges. Inside it,
  every left edge is the gutter (`space-lg`): the search field or the Back
  glyph, the path, the title, a section header, a thumbnail, a tree
  chevron's glyph, a flat location row's type icon, a checkbox's box,
  and in a sheet its title and rows. Every right edge is the
  gutter: Scan or Add, counts, a section's action text, the add bar's Add
  button, a sheet's Close glyph.
- The side navigation keeps its own text edge, 20px: an 8px inset plus 12px
  inside each entry. It is outside the column, so the gutter rule does not
  reach it.
- Only one navigation is in the page at a time. The other is not rendered,
  not hidden.
- Nothing animates when the arrangement changes.
- The viewport declares `viewport-fit=cover`, and the bars pad for safe
  areas: the top bar adds the top inset, the bottom bar is `nav-height`
  plus the bottom inset, and the toast sits above both.
- The top bar holds only those things. A page's own actions live in its
  page header.
- No title bar, footer, floating action button or right-hand panel. Bars
  are `ground` with a hairline edge, never shadowed or blurred.
- A wide screen shows the same content with more room. It gets no extra
  columns, cards, panels or features.
- Components own the gutter and the space between them. Full-width
  components (page header, list section and its rows, value rows, empty
  state) pad themselves; the page lead pads the controls it holds. A page
  file sets no gap, padding or margin.
- The first focusable thing is a skip link to the content. Each page sets
  the document title to its own title, then "Binsight". After navigating,
  scroll goes to the top, or back to where it was on Back, and focus moves
  to the page title, once it shows if the page is still loading.
- A control's name includes the words it shows: an empty value reads
  "{label}: {invitation}", such as "Category: Add a category".
- Every page, sheet and menu passes WCAG 2.1 AA in light and dark, as the
  accessibility end-to-end test checks with axe.

**Installed.** Added to the home screen, Binsight opens standalone with
the `ground` color behind its status bar and splash. Its icon is the bin
mark; the maskable one keeps the mark inside the safe zone on `ground`.
Long-pressing the icon offers Scan (`/scan`), Add (`/?add`, which opens the
Add sheet over the location tree; closing it drops `?add`) and Search
(`/search`).

**Top bar.** On a phone: Back when shown, the search field, Scan when
available. On a wide screen: the search field, taking the room left in the
column, then Scan and Add when available.

- Back shows on every page except the four destinations (`/`, `/views`,
  `/inbox`, `/settings`). A destination's page says so to the frame; the
  frame does not guess from the address. It goes to the previous page in the app. With no
  previous page, as when a scan opened it, it goes to the parent: a
  location's parent, an item's home location, a view's `/views`. Wide
  screens have no Back; the path does that job.
- Without Back, the search field starts at the gutter. With Back, the Back
  glyph is at the gutter.
- Typing in search opens `/search` and updates the results as you type. The
  field always shows the current query, and has a Close icon button to
  clear it when not empty. On `/search`, Back returns to where the search
  began.
- Controls in the bar are drawn 40px high (with a `touch-min` tap area)
  and kept `space-sm` apart at every width. Because `bar-height` stays 56px
  including its hairline, 48px drawn controls leave only 3–4px vertically
  and clip the 2px focus ring (`2px` offset); drawing them 40px high
  leaves clear margin for focus rings without growing the bar.

**Bottom bar.** Exactly five slots: Home, Views, Add, Inbox, Settings.
Someone who may not change the home has no Add; a visitor, not signed in,
sees three: Home, Views, and "Sign in" (`login`) in Inbox and Settings'
place.

- Add is its only `accent` item. The current destination gets a
  `highlight` block behind its icon and its label in 650; pages below a
  destination keep their parent lit.
- Labels are `text-nav`. Inbox's count badge is `text-nav` in a 20px
  `inverse` box.
- While rows are selected, the selection bar takes its place.

**Side navigation.** Top to bottom: the Binsight bin mark and "Binsight" in
`text-heading`, centered in
a `bar-height` band so it lines up with the top bar; primary links (`Home`,
and `Inbox` with its count when present); extensible grouped sections
separated by a hairline (such as `Views`, with its header linking to
`/views` and underneath each built-in view that lists something, then each
pinned saved search with `pin`, all with their counts); then
`Settings`, pinned to the bottom while the entries above it scroll. A
visitor has no Inbox, and "Sign in" in Settings' place.

- An entry is `text-body`; the current one is `text-body-strong` on
  `highlight`. A long name wraps; its icon and count stay on the first
  line.
- A section header is bold `text-small` in `muted` (sentence case, no
  all-caps or letter spacing) and `touch-min` high when it links to a page.
- Views is lit on `/views`. On `/views/{view}` only that view is lit. The
  Inbox is not repeated among the views.
- The Binsight bin mark (`BrandMark` and favicon) sits on a transparent
  ground with an `accent` lid and `label` sticker: an `ink` body in light
  mode, and `inverse` with a `control-border` outline in dark mode.

### Page templates

Every page is one of seven templates. "Header" is the page header component.

**Browse** (`/`, `/l/{code}`, `/locations/{id}`, `/views`)

1. Header: the parent path; the title and large code chip; the summary; the
   counts; up to two default buttons and More. A
   location always has the 96px thumbnail beside the title: its photo,
   shown nowhere larger, or else its icon. Tapping the thumbnail opens the
   type and icon sheet. On a location the button is Move ("Add
   location" in place of Move on a site); tapping the large code chip opens
   the label sheet. More holds, in
   groups split by rules: "Add location" when there is no Locations section
   (not on a site); "Contents sheet" and "Insurance list", which open the
   location's print pages; "Add photo" ("Replace photo" when it has one),
   which opens the camera, "Remove photo" when it has one, and "Type and
   icon…" (`icons`); then, when it has no own item, "Track as an item"
   (`armchair`), which makes its own item and opens that item's page,
   saying "Tracked as an item", and "Use an existing item…"
   (`list-search`), which opens a sheet of item search results to pick
   one from, saying the same; then "Merge into…" (`arrow-merge`) and "Delete
   location" (`trash`, `danger`) last. A photo says
   "Added a photo to {place}" or "Removed the photo", with Undo; the type and
   icon sheet says "Changed to {type}", "Icon changed" or "Icon reset",
   with Undo. The title
   and the summary ("Add a summary" when empty) are edited in place, saying
   "Renamed to {name}" or "Summary changed", with Undo. "Merge into…" opens
   the move sheet titled "Merge into", then goes to the location picked,
   saying "Merged {name} into {name}". "Delete location" deletes an empty
   location at once; one with items or locations in it first opens the move
   sheet titled "Move contents to". Either way it goes to the parent (`/`
   for a site), saying "Deleted {name}". Both offer Undo and no dialog.
2. The add bar, on a location only. The page's one accent.
3. "Here / Everything inside", only when the location contains other
   locations.
4. Section "As an item", only when the location has an own item, with its
   one action "Open item". Its rows are value rows with the name beside
   the value: the item's status when lent or archived, then whichever of
   brand, model, serial number, purchase date, price and warranty end are
   filled, read-only. With none filled, one row "Details: None yet".
5. Section "Locations" with its count and its one action, "Add location";
   then section "Items" with its count. An empty section is left out. A
   location with neither shows the empty state "This bin is empty", using
   its type's word, under the add bar.

`/` is titled "Locations" and shows the sites as one list with no section
header; the navigation item stays "Home". `/views` is a header ("Views")
and one list of view rows, every built-in view in this order with its
count: Lent out (`user`), Missing (`zoom-question`), Warranty expiring soon
(`shield-check`), Return window closing (`receipt-refund`), Recently added
(`square-plus`), Recently moved (`arrows-move`), Possible duplicates (`copy`) and Archive (`archive`). Then
section "Saved searches" with its count, pinned ones first (`pin`, the rest
`search`), left out when there are none. `/l/{code}` opens
`/locations/{code}`, since a location's code is its identifier.

A deleted location's page, reached at `/locations/{id}` or from its label,
is its header alone: the parent path, the title and code chip, "Deleted
{time ago}" in `muted`, and the one default button "Restore"
(`arrow-back-up`), which says "Restored {name}" with Undo. No More, no add
bar, no sections. Restoring brings it back empty, so the page becomes the
location's page with "This bin is empty".

**List** (`/search`, `/views/{view}`, `/inbox`)

1. Header: the title and the count. On `/search` the title is the query in
   quotes.
2. One row of filter chips, which scrolls sideways under 48em and wraps
   above it. Left out when the list has no filters.
3. One list of item rows (and location rows on `/search`), or the empty
   state. No section header: the page title already names the list.
   `/inbox` shows each item's path, and its empty state reads "Nothing is
   missing".
   `/search` lists items and locations in one list, best match first: item
   rows with their paths, and flat location rows. The matched parts of each
   name are marked. With nothing found, the empty state reads "Nothing
   matches "{query}"" with the default button "Add "{query}"", which opens
   the Add sheet with that name in the add bar. With no query yet, the
   title is "Search" and nothing is listed until a filter is set, when the
   items it keeps are listed by name and the empty state reads "Nothing
   matches".
   `/search` has the chips Location, Category, Tag, Status and Warranty.
   Tapping one not pressed opens its sheet ("Filter by location", the move
   sheet's rows; "Filter by category" and "Filter by tag", name rows with
   their counts; "Filter by status" and "Filter by warranty", the fixed
   words); picking presses it, showing "In {place}", the category, the tag,
   the status's word, or "Warranty ending soon". Tapping a pressed chip
   clears it. Once there are words or a filter, the header's default
   button "Save search" opens the "Save search" sheet: one field "Name",
   starting as the words, and a primary "Save". It says "Saved {name}"
   with Undo.
   `/views/{view}` lists a built-in view: item rows with their paths. Lent
   out and Archive rows add how long ago after the badge, `muted`
   `text-small`. The count reads "3 items". The empty states: "Nothing is lent out",
   "Nothing is missing", "No warranties end in the next 30 days", "No
   return windows close in the next 30 days", "Nothing added in the last
   30 days", "Nothing moved in the last 30 days", "No possible duplicates", "The archive is empty".
   A saved search at `/views/{id}` is titled with its name, counts its
   results and lists them as `/search` does, without chips. Its default
   button is "Pin" (`pin`) or "Unpin" (`pinned-off`), saying "Pinned
   {name}" or "Unpinned {name}"; More holds "Rename…", which opens the
   "Rename" sheet (field "Name", primary "Rename") and says "Renamed to
   {name}", and "Delete saved search", which goes back to `/views` and says
   "Deleted {name}". Each offers Undo.

**Record** (`/items/{id}`)

1. Header: the 96px thumbnail, with the path, the title, the status
   badge and the quantity stepper beside it; up to two default buttons
   and More under both. When the item has no photo, tapping the
   thumbnail opens the camera to add one, saying "Added a photo to
   {name}" with Undo. The first button is Move.
   The second follows the status: "Mark missing" in place, which says
   "Marked {name} missing"; "Mark found" when missing, which opens the move
   sheet titled "Where is it now?" with the item's home first as "Where it
   was" and says "Found {name} in {place}"; "Mark returned" when lent out,
   which says "Returned {name}"; and "Back in place" when in use or
   archived, which says "{name} is back in place". More holds, in groups
   split by rules: "Change status…" (`status-change`, not while archived),
   which opens the status sheet; then "Link an item", which opens
   the link sheet, "Attach…", which opens the Attach sheet, and
   "Duplicate" (`copy`), which opens the copy's page, saying "Duplicated
   {name}", and, on a location's own item, "Stop tracking as the location"
   (`link-off`), saying "No longer tracked as an item"; then "Merge into…" (`arrow-merge`), which opens the merge sheet
   and goes to the item picked, saying "Merged {name} into {name}"; then
   "Delete item", which goes to the item's location
   (or `/inbox`) with the toast "Deleted {name}". Every one offers Undo. A
   lent-out, archived or deleted item's page reads when, as a `muted`
   `text-small` line under the title: "Lent 2 weeks ago", "Sold 3 days
   ago", "Deleted {time ago}". A deleted item's page has the default button
   "Restore" in place of Move, and no quantity stepper, no clickable
   thumbnail and no More; restoring says "Restored
   {name}" with Undo. History says "Lent to {person}", "Returned", "Marked
   in use", "Back in place", "Sold", "Given away" or "Thrown away"; a
   merge says "Merged into another item" on the item folded in and
   "Another item merged into this" on the other.
2. Sections of value rows: "Details", then others only when they hold a
   value or are being added to. Details lists Category, Tags, Notes,
   Brand, Model, Serial number, Purchase date, Price, Order link,
   Warranty ends and Return by, in that order, as value rows with the name
   beside the value, each empty one as the invitation "Add". Category is a chosen value that
   opens the category sheet; Tags holds the tag list, whose "Add tag"
   opens the tag sheet; the rest are editable text, the dates in the
   date field and the price typed as "24.99" and shown as a
   plain number, since an install has one currency. A price that isn't
   one is not saved. Each change says "Changed {detail}", "Category set to
   {name}", "Removed category", "Tagged {tag}" or "Removed tag {tag}", with
   Undo, and history says "{Detail} changed", "Tagged {tag}", "Tag {tag}
   removed", or "Details changed" for several at once. A deleted item's
   page has no Details section.
   Then "Attachments", only when the item has any: attachment rows, photos
   first and then files and web links in the order added, with the
   section action "Attach". Attaching says "Added a photo to {name}",
   "Attached {filename}" or "Attached link to {name}", and the row's
   "Remove" icon button says "Removed {name}", each with Undo; history says
   "Added a photo", "Attached {filename}", "Attached a link" or "Removed
   {name}". A file can be a receipt, a manual or anything else: its
   filename says which. A deleted item's page has none.
   Then "Belongs with", "Part of" and "Parts", each only when it has
   linked items: item rows, each ending in a "Remove link" icon button that
   says "Removed link to {name}" with Undo. Linking says "Linked {name}".
   Both items' history says "Linked: belongs with", "Linked: part of" or
   "Linked: a part" from its own side, or "Link removed"; history keeps no
   names, so the sections say which item. A deleted item's page has none.
3. Section "History", last: a list of history rows, newest first.

**Task** (`/scan`). Full screen in the task frame, so nothing
is tapped by mistake.

`/scan` is the task "Scan": the scanner in the work area, held to the
gutter, and a scanned label opens `/l/{code}` as the phone's own camera
does. Its primary button, "Type the code", swaps the scanner for one
"Code" field, and the button becomes "Open"; Enter does the same. Close
goes back, or home when `/scan` was the first page.

1. A `bar-height` row: Close at the gutter, then the task's name.
2. The work area, in the column.
3. One primary button, pinned to the bottom above the safe area, the full
   width of the column. A toast shows above it.

**Settings** (`/settings`, signed in only). Header ("Settings"), then
sections of value rows, each with `space-xl` above its header like every
section. A section whose action is the only way to add to it shows even when
empty: "MCP credentials", whose action is "Add MCP credential".

"Your account" comes first, for every role: "Signed in as" ("sam · Edit"),
"Password" with a default "Change" button that opens the "Change password"
sheet (current password, then the new one twice), and "This device" with
"Sign out". The sections after it are an admin's only.

"Accounts", whose action is "Add account": one value row per account, its
username as the name and its role ("View", "Edit", "Admin") as a chosen
value. Tapping the role opens a sheet titled with the username: the three
roles as name rows, the current one checked, picking one changes it at
once; then the new password twice and a default "Set password" button;
then a `danger` "Delete account", which closes the sheet and asks in a
dialog. "Add account" opens a sheet with Username, the password twice and
the three role rows, View checked, and a primary "Add".

"Export and import", after "MCP credentials", has three value rows. "Export
everything" holds a default "Download" button that downloads the zip.
"Insurance list" holds a default "Open" button that opens `/insurance`.
"Import from CSV" holds a default "Choose file" button that opens the file
picker; the import runs at once and says "Imported {n} items into {m} new
locations" (or just "Imported {n} items"), with Undo. A file with rows that
can't be imported opens the "Can't import" sheet: one value row per
problem, named "Row {n}" and holding "{column}: {message}", then a primary
"Close". Any other refusal is the usual toast with Retry.

"Backups", after "Export and import", has the action "Back up now". Its
value rows are the backups kept, newest first, each named by when it was
taken in the owner's date and time format ("Nov 18, 2026, 3:00 AM") and
holding its size ("12.4 MB"). Backing up adds the new row at the top with
no toast, since there is nothing to undo. Restoring is not in the app; it
is done on the server.

**Print** (`/insurance`, `/locations/{id}/insurance`,
`/locations/{id}/sheet`). A page made to be printed, outside the frame: no
navigation, top bar or bottom bar, on `surface` at `content-max`.

1. On screen only, a `bar-height` row: Close at the gutter, which goes back
   (or to the location, or `/settings`, when opened from its address), the
   page's name, and the primary button "Print", which opens the browser's
   print dialog.
2. The page header: the path above, the title, the large code chip and
   the counts. No buttons and no More.
3. Sections of print item rows.

Printed, the bar is left out, the colors are the light ones even in dark
mode, a row never splits across two sheets, and a section's header stays
with its first row.

"Insurance list" is titled with the location's name, or "Everything" at
`/insurance`, and its counts are "{n} items", "Total {price}" (each price
times its quantity), "{n} items have no price" when any lack one, and
"Made {date}". One section, "Items", holds every item still owned, by
path, then name; each row lists Where (the path, or Inbox), Brand, Model,
Serial number, Purchase date, Price, Order link and Receipts (every file
and web link by name), leaving out those not entered, then every photo.
"Contents sheet" is titled with the location's name, shows its label
under the header so the paper scans like the bin, and has one section per
location: the location itself, then each one inside it, parents first,
titled by its path below the sheet's location, with its code chip and a
count; an empty one is its header with 0. Rows on both read "{quantity} ×
{name}", with "In use", "Lent out" or "Missing" after the name.

**Print item row** (`PrintItem`). An item on a printed page: the quantity
and name, a muted status word, then its details as `text-small` name and
value pairs and its photos at 96px. No controls.

**Gate** (`/login`, and creating the first account on a new install). The
gate frame: a `gate-width` column, centered across and placed in the upper
third, holding Binsight in `text-title`, its fields and one primary
button. Signing in is Username and Password, then "Sign in". A new install
says "Make the first account. It is an admin, and can add everyone else.",
then Username, Password and Repeat password, then "Create account". It is
reached from "Sign in" in the navigation, and by opening a page that needs
an account; it is never in the way of reading the home.

| Path              | Template | Lit navigation item |
| ----------------- | -------- | ------------------- |
| `/`               | Browse   | Home     |
| `/l/{code}`       | Browse   | Home     |
| `/locations/{id}` | Browse   | Home     |
| `/items/{id}`     | Record   | Home     |
| `/search`         | List     | None     |
| `/views`          | Browse   | Views    |
| `/views/{view}`   | List     | That view |
| `/inbox`          | List     | Inbox    |
| `/scan`           | Task     | None     |
| `/settings`       | Settings | Settings |
| `/insurance`      | Print    | None     |
| `/locations/{id}/insurance` | Print | None |
| `/locations/{id}/sheet` | Print | None |
| `/login`          | Gate     | None     |

`/design` exists only in development builds and is outside the templates:
it renders every token and component, in the frame, for checking the
design by eye. Under it, `/design/{template}` shows each template that has
no real page yet, built from sample data. A real page copies its template's
specimen, which is then deleted
([decision 0015](decisions/0015-specimens-end-with-their-page.md)).

### States every page in the frame handles

| State | What shows |
| ----- | ---------- |
| First load | The frame at once. The content area stays empty `ground` until the data arrives, then fills with no layout shift. After a second, the empty state "Still loading", with no button. No spinner, no skeleton. |
| Reload or return | What was there, updated in place. |
| Empty | The empty state, under the header. |
| Unknown address or code | An empty state stating the fact, with no header ("No label has the code B-9999" or "Nothing at this address"), and one button, inside the frame whenever possible. |
| Backend unreachable | The empty state "Can't reach Binsight" with a "Try again" button, inside the frame whenever possible. Changes already on screen roll back with a refusal toast. |
| Unexpected error (500) | The empty state "Something went wrong" with a "Try again" button, caught inside the frame's error boundary so navigation stays usable. |
| Signed out | The home, read-only (below). A page that needs an account, such as Settings or an insurance list, sends to the Gate, then back to the address that was asked for. |
| Read-only | For a visitor, and for a View account: every control that changes the home is left out, never shown disabled. No add bar, Add, Move, stepper, select box, rename, invitation or More action that changes things; values read as plain text and empty ones are not shown. The code chip's label sheet and the print pages stay. A visitor also sees no prices, serial numbers, order links, files or history. |
| Long content | Names and paths wrap. A 60-character name and a six-segment path never push a row's controls off screen or overlap them. |

### Sheets and the keyboard

A sheet that holds a field keeps the field and its primary control fully
visible above the on-screen keyboard, in iOS Safari and Android Chrome and
when installed to the home screen. On a phone the sheet is placed in the
visual viewport, the part of the screen the keyboard leaves, since iOS Safari
scrolls the page under the keyboard instead of resizing it. This is checked on a real phone before
flow 2 is called done.

### Where things go on a page

1. Identity: the page header says what this is and where it is.
2. The fastest action: on a location, the add bar.
3. Contents, in list sections. Locations inside come before items.
4. History and rarely used details.

Actions on the page's subject live in the page header. Actions on one row
live on that row or on its page. Actions on many rows appear in the selection
bar while rows are selected. One decision opens
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

**Button** (`Button`). One size, `touch-min` high (drawn 40px inside a `bar-height`
bar with a `touch-min` tap area).

| Kind    | Looks like | Use for |
| ------- | ---------- | ------- |
| Primary | `accent` fill, `accent-edge` border | The most likely action. At most one visible, not counting Add in the navigation. |
| Default | `surface` fill, `control-border` | Every other action. |
| Subtle  | Underlined `ink` text | A lesser action beside a default button; links in text. |
| Danger  | `danger` fill | The confirming button in a dialog. Nowhere else. |

An icon before the text is optional. No blocking spinner for add, move or
quantity. Prefer an enabled button that explains a refusal in a toast over a
disabled one.

**Icon button** (`ActionIcon`). `touch-min` square (drawn 40px inside a
`bar-height` bar with a `touch-min` tap area), 24px icon, only for the
icons listed under Icons. Plain in bars and rows, bordered beside default
buttons, `accent` only for Add.

**Menu** (`Menu`). Opens beside its More button at every width. Holds what
did not make the two header buttons. Verb-first rows with a 20px icon. A destructive
row is `danger` (`color="danger"`), last, below a rule. Rows of one kind form a group, and
groups are split by rules. No nesting, no toggles, eight rows at most.

**Text field** (`TextInput`, `Textarea`). `surface` fill, `touch-min` high
(drawn 40px inside a `bar-height` bar with a `touch-min` tap area),
`text-body`. The name sits above in bold `text-small`, one to three words. A
placeholder is an example or "Optional". Nothing is marked required. The
line under a field exists only for an error. Search is this field with a
leading icon; batch add is its multi-line form, one name per line.

**Checkbox** (`Checkbox`). A `control-border` box in a `touch-min` target,
its border `ink` on hover; ticked is `accent` with an `on-accent` tick that
fades in. A box is 28px. Bulk selection's box is a 20px badge over the
thumbnail's top left corner, labeled "Select {name}", with the whole
thumbnail as its target; a selected row takes `highlight` and its photo
dims. Settings that are on or off use `Switch`.

**Segmented control** (`SegmentedControl`). Two or three views of the same
list, each with its count: "Here" and "Everything inside" on a location. The
chosen segment is `inverse`, not `accent`. It never navigates. Its outer
height is exactly `touch-min`, so it lines up with a button beside it; a
segment's drawn size follows from that, and its tap area is the control's
full height.

**Filter chip** (`Chip`). Drawn 40px high, with a `touch-min` tap area.
Pressed is `highlight` with an `ink` border and shows its value. Chips sit
in one row under a List page's header, scroll sideways under 48em and wrap
above it. Tapping an unpressed chip opens a sheet to pick its value;
tapping a pressed one clears it.

**Tag** (`Badge`, outline, arranged by `TagList`). `text-small`, `muted`,
hairline box, `radius-sm`. Never colored. Tapping one searches for it;
when editable, a `touch-min` remove button sits beside the tag and a
subtle "Add tag" button follows the list.

**Toast** (`Notifications`). `inverse` background, action in `accent`, one
at a time. Every reversible action shows one with Undo for 6 seconds; this
replaces "Are you sure?". A refusal puts the screen back, says what is now
true, offers Retry, and stays until dismissed. No titles, ticks or stacking.
Adding says "Added {name} to {place}", "Added {n} items to {place}" or
"Added a photo to {place}", where the place is the location's name
("Cables") or "Inbox"; "Add to existing" says "Added 1 more {name}"; a
burst on the quantity stepper says "Quantity of {name} changed to {n}";
naming an item says "Named {name}".

**Dialog** (`ConfirmDialog`, built on `Modal`). Only for what cannot be
undone: emptying deleted items for good, revoking an
MCP credential. The title is the question and names
the thing and the number. Two verb buttons, the safe one first and focused:
"Keep them", "Delete forever". The safe button carries `data-autofocus`.

### Binsight components

**Editable text** (`EditableText`). Editing in place: a value shown on a
page is edited where it is shown: plain text at rest, `hover` fill on hover,
a focused field on tap, its border drawn around the text where it rests so
nothing on the page moves. Enter or leaving saves, Escape cancels. No Save
button. An empty optional value shows as a `muted` invitation ("Add a
summary") only on the thing's own page. A date is edited in the date field
and reads at rest in the owner's own date style ("1 Mar 2027"). For
someone who may not change it, it is plain `ink` text with no hover and no
tap, and an empty value shows nothing.

**Date field** (`DateField`, built on Mantine `DateInput`). A text field
that opens a calendar under it as it takes focus. A date can be typed
("2027-03-01" or "Mar 1, 2027") and saved with Enter or by leaving, or
picked, which saves at once. Escape leaves it as it was, and an emptied
field clears it. The calendar floats like a menu (`surface`, hairline
border, `shadow-overlay`): month and arrows on top, `muted` weekday
initials, then `touch-min` days with `radius-sm`, today ringed in `ink` and
the chosen day `accent`. The week starts on the owner's locale's first day.

**Sheet** (`Sheet`: a Mantine `Drawer` from the bottom, a `Modal` from `md`
up). One title, one choice. Picking a row acts and closes it. The move sheet
lists recently used locations first. A sheet never opens another sheet and
never holds more than one field.

The category sheet is titled "Category". Its one field, "Search or make a
category", narrows name rows of the categories items have, each with its
count, up to five picked recently on this device first, then the rest; when the typed name matches none, the first row is "Make
"{name}"", and Enter picks the typed name. A subtle "No category" follows
the field while the item has one. The tag sheet is titled "Add tag": one
field, "Tag", a primary "Add", and name rows of the tags in use that the
item lacks, narrowed as it is typed.

The type and icon sheet is titled "Type and icon", and each opening makes
one pick. Its one field, "Search icons", sits over an icon grid. With the
field empty the grid holds "Type's icon" first, which clears the choice,
then a short starter set for home storage; typing searches every icon's
name and tags, words in any order. Below, under the heading "Type", the
six types a location other than a site can have are name rows, each with
its icon before its name and the current one marked with `check` at the
right; a site has no Type heading or rows, as it cannot change. Picking a
type or an icon acts and closes the sheet.

The status sheet is titled "Change status": name rows, each with its icon,
for "Lend…" (`user-share`), which swaps in the Lent to sheet and says "Lent
{name} to {person}"; "Mark in use" (`hand-grab`, not while in use), which
says "Marked {name} in use"; and "Sold" (`cash`), "Given away" (`gift`) and
"Thrown away" (`trash-x`), which say "Marked {name} sold" and so on.

The Lent to sheet is titled "Lent to": one field, "Name", a primary
"Lend", and name rows of the names items were lent to before, most recent
first, narrowed as it is typed. The link sheet is titled "Link an item":
one field, "Search items", over item rows found as it is typed, leaving out
the item itself and what it is already linked to. Picking a row swaps them
in place for three name rows: "Belongs with {name}", "Part of {name}" and
"{name} is a part of this". The merge sheet is titled "Merge into": the
same "Search items" field over item rows, leaving out the item itself;
picking a row merges at once, with Undo and no dialog.

The Attach sheet is titled "Attach": three name rows, "Take photo", which
opens the camera, "Choose file", which takes a PDF, JPEG, PNG or WebP, and
"Add link", which swaps in the Add link sheet: two fields, "Address" and
"Name", and a primary "Attach".

The label sheet is titled "Label": the location's label image at the
column's width (at most 360px), with a hairline border, then a primary
"Download" (`download`), which saves it as "{code}.png", and "Open to print"
(`external-link`), which opens the image in its own tab for the browser to
print. The app does no print layout.

The move sheet is titled "Move to". Its one field, "Search locations or
scan", narrows the rows by name or by code (typed loosely, as `b14`), and
ends in a "Scan destination" icon button that swaps the rows for the
scanner in the same sheet ("Show locations" swaps them back). Its rows are
flat location rows: up to five recently used on this device, then the rest
in tree order. It leaves out where the thing already is and, when a
location is moving, the location and everything inside it. A scanned label
that cannot be the destination says why in the scanner's line ("Already in
Cables", "Can't move into Small box", "No location has the code ZZZ-999")
and scanning carries on. Picking moves the thing on screen at once; the
toast reads "Moved to {place}", naming the place by its name, with
Undo. Move is a default button in the header of an item's page and of every
location's page except a site's.

**Scanner** (`CameraView`). A square video of the camera, `radius-md` with a
hairline border, and one `text-small` `muted` line under it: "Point the
camera at a label", or what the last code led to ("That isn't a Binsight
label"). When the camera is refused or there is none, the line says to
allow the camera in the browser's settings. Only a label address counts as
a code.

A value shown only once, such as an MCP credential's secret, is a read-only
text field holding what the owner will paste, with a default "Copy" button
(left out where the browser has no clipboard), the single small line in
settings saying it is not shown again, and a primary "Done". Copy's label
becomes "Copied" until the sheet closes: the one narration allowed, since a
copy changes nothing on screen.

The title sits at the gutter and Close is a `touch-min` icon button with its
glyph at the gutter, like the top bar's. The body has no side padding: rows
bring their own gutter and their hairlines reach the sheet's edges, and a
form is padded with the gutter (and `space-xs` above so a focused field's
ring clears the header) by the sheet. The modal from 62em does the same
with `space-xl`.

**Path.** `text-small`, `muted`, 16px chevron separators, last segment bold
`ink`. Each line is `text-small`'s 20px; a linked segment's `touch-min` tap
area reaches past the line instead of growing it. Never truncated; it wraps. A page header shows the parents only, each
segment a link. A row shows the full path to the home location as plain
text, since the whole row opens the item. Each segment
is the location's name; its code is shown only in code chips.

**Code chip.** `label` fill, `on-label` text and 1.5px border, `radius-sm`,
mono. Regular beside a location's name; large once, in a location's
page header, where tapping it opens the label sheet. Shows the code exactly
as printed. Only for location codes.

**Status badge.** Icon, word, 1.5px outline in one color, never filled. In
place shows nothing.

| Status | Color | Icon | Words |
| ------ | ----- | ---- | ----- |
| In use | `ink` | `hand-grab` | In use |
| Lent out | `lent` | `user` | Lent to {name} (or Lent out) |
| Missing | `danger` | `zoom-question` | Missing |
| Sold, given away, thrown away | `muted`, dashed | `archive` | Sold / Given away / Thrown away |

No other badges exist. Nothing is badged "New" or "Incomplete".

**Quantity stepper.** Minus and plus either side of a tabular number. Its
outer height is exactly `touch-min`, so it lines up with a button beside it;
the buttons' drawn size follows from that, and each has a `touch-min` tap
area.
On an item's page while not deleted; in a row only when the quantity is above one. A
burst of taps is one change, one history entry, one Undo. Tapping the number
types an exact value. Minus stops at 1. No "low" coloring.

**Thumbnail.** A square, `radius-md`, hairline border: 48px in rows, 96px on
an item or location page. Without a photo it is `surface` with a `muted`
icon: `package` for an item, the location's icon for a location, with no
plus sign or caption. On a location's page it is a button named "Change
type and icon"; on an item's page without a photo (and not deleted) it is a
button named "Add photo" that opens the camera to add one — both with the
hover fill and focus ring of any button.

**Item row.** Thumbnail, then the name over a line holding the path and any
status badge, then the quantity stepper if shown; for someone who may
not change it, a quantity above one reads "×3" in `muted` `text-small`
where the stepper would be. The whole row opens the
item; no chevron. Inside a location's own contents the path is left out,
and a Move icon button ends the row, so moving takes two taps: Move, then
the destination. Search results end in Move too, with the path kept. Under 48em a row with both puts the stepper on its own
line under the name.
Full width on `ground`, hairline below, at least `row-min` high, and a path does not make it taller. Hovering the row
fills it with `hover`; hovering Move, the stepper or the select box fills only that control, so the
two targets never read as one. Move sits a `space-sm` in from the gutter. In a list that allows bulk edit, every row's thumbnail carries its
select box, so the row keeps its layout. Names wrap;
nothing is cut with an ellipsis. Matched search text is marked with
`highlight`. No swipe gestures. An item added by photo and not named yet
reads "Unnamed" in `muted`, here and as its page's title, which is edited in
place like any name; it is a fact, not a prompt.

**Attachment row.** A 48px thumbnail (the photo itself, or in `muted`
`photo` for an image file, `file-type-pdf` for a PDF and `world` for a web
link), then the name over a `muted` `text-small` line with a file's size or
a named link's site, then a `touch-min` "Remove" icon button (`x`). A photo
without a filename reads "Photo", a link without a name its address. The
whole row opens it in a new tab. Full width on `ground`, hairline below, at
least `row-min` high.

**Location row.** Expand toggle (only with children), type icon, name, code
chip, count of every item inside in `muted` at the right.
`touch-min` high. In a tree (a list where a row can expand, as on `/`) every
row keeps the toggle's room, each level indents `space-xl`, and at the top
level the toggle's glyph sits at the gutter. In a flat list (a location's
"Locations" section, search results, the move sheet) there is no toggle and
the type icon sits at the gutter. The list says which it is. The toggle
expands in place; the rest of the row opens the location. No summary in the
tree. On `/search` the matched parts of its name are marked with
`highlight`, as in an item row.

In a location's "Locations" section, and on `/` while every branch is
closed (so the rows are just the sites), each row ends in a drag handle:
a `grip-vertical` icon button, `touch-min`, in `muted`, named "Reorder
{name}", pulled into the row's padding as the add button is. Dragging it
moves the row among its siblings; the dragged row is drawn on `surface`
above the others. With the keyboard, Space picks the row up, the arrow
keys move it, Space drops it and Escape puts it back, each step announced.
Dropping updates the list at once and says "Moved {name}" with Undo; a
refusal puts the order back.

**History row.** One change to the thing, in a Record page's History
section. A line saying what happened in `text-body` ("Added", "Quantity
changed from 3 to 4"), and under it one `text-small`, `muted` line: when, in
words ("3 weeks ago"), then who ("You" for this account, another
account's username, "Claude" for MCP, "Someone" for a change from before
accounts). Full width, hairline below, at least `row-min` high, and its text
wraps. Not tappable: no icon, no badge, no chevron.

**View row** (`ViewRow`). A view or saved search on `/views`: a 20px
`muted` icon at the gutter, the name in `text-body`, and its count in
`muted` `text-small` at the right. `touch-min` high, hairline below; the
whole row opens it.

**Name row** (`NameRow`). A category or tag in a sheet: its name in
`text-body`, and how many items have it in `muted` `text-small` at the
right. `touch-min` high, hairline below; the whole row picks it.

**Icon grid** (`IconGrid`). Icons to pick from, in a sheet: `touch-min`
square buttons, `space-xs` apart, wrapping to fill the column from the
gutter, each a 24px `ink` icon with no word under it, named by its words
("tools-kitchen-2" is "Tools kitchen 2"). The chosen one has a `highlight`
fill and is pressed. It shows at most 60; when more match, a `muted`
`text-small` line under it says "60 of {n} shown. Keep typing to narrow."

**Chosen value** (`ChosenValue`). A value row's value that is picked in a
sheet rather than typed: it reads as editable text does at rest, with the
same invitation when empty, and tapping it opens the sheet.

**Value row.** A name and its value, for the Record and Settings templates.
The name in bold `text-small` above the value, `space-xs` apart, with
`space-sm` above and below; the value as editable text or one control. An
editable text value takes its line height; a button or switch keeps
`touch-min`. Full width, hairline below. In an item's Details, a long list
of short values, the name sits beside the value instead: a 7.5rem `muted`
column, `space-md` from the value, on the value's first line, and an empty
value's invitation in `text-small`.

**List section.** A `text-heading` noun ("Items"), its count in
`text-small`, at most one subtle action, over a 1px `ink` rule. `space-xl`
above. Sections are separated by space and the rule, never boxes. An empty
section is left out, unless it is the page's main list. The one list of a
List page, and of `/`, has no header: the page title names it. A list with
no header has `space-lg` above and a hairline above its first row.

The Locations section's action is "Add location". On `/`, and on a location
with no locations inside it, there is no Locations section to hold it, so
"Add location" is a default button in the page header instead. Either way
it opens a sheet with one field, the name. The new location's type follows from its parent: a site at
the top, a room inside a site, a bin anywhere else. Its page changes it.

**Add bar.** The quick-add field, and the only field with an `accent`
underline. At the top of a location's contents and in the add sheet, nowhere
else. It states the destination: "to" and the code chip or name, or "to
Inbox"; tapping that changes it. Its destination and camera controls follow
the `bar-height` rule (drawn 40px high with a `touch-min` tap area) above
the 4px `accent` bottom border so hover and focus states never overlap it;
when its text field is focused, the bar uses a flush `focus` border and 1px
inset ring instead of an offset outline so no gap or corner seam opens
between the frame and the `accent` underline. Enter adds, clears and keeps
focus, and the default Add button beside "Add several" does the same. A
camera button adds by photo; "Add several" swaps in the multi-line field.
The destination, the camera and "Add several" are each present only where
the page supports them; without "Add several" the row under the bar holds
Add alone. A
likely duplicate appears as a `DuplicateSuggestion` row beneath (`text-small`
notice with subtle "Add to existing" at the right gutter) and never
blocks Enter.

The row `space-sm` under the bar holds "Add several" (or "Add one" while
adding several) before the default Add button at the right edge and is
`touch-min` high.

Pasting more than one line into the one-name field switches to "Add
several" with the pasted lines in it. A likely duplicate is an item already
in the destination with the typed name, ignoring case.

The add sheet, opened by Add in the navigation, holds the add bar alone. Its
destination starts as the location whose page is showing, or the inbox.
Tapping the destination swaps the bar for "Add to", the tree of every
location with a subtle "Inbox" action; tapping a row or "Inbox" picks it and
brings the bar back.

**Page header.** In order, leaving out any line with nothing in it: the
parent path; the title and large code chip; the summary, edited in place;
the counts; at most two default buttons and a More icon button. No
eyebrow above the title. It scrolls with the page. The lines before the
buttons are one group, `space-xs` apart; the buttons sit `space-lg` below.
It sets the document title. On a location's page the large code chip is a
button named "Label {code}" that opens the label sheet, with a `touch-min`
tap area.

With a thumbnail (an item's or location's page), the thumbnail is at the
left and the path, title, status badge and (on a live item) quantity
stepper sit `space-md` to its right, top-aligned, at every width, with
`space-sm` above the stepper so tappable controls stay separated. The
buttons and More run the column's full width, `space-lg` under the taller
of the two.

**Page lead.** The top of a page: the page header, then the controls that
belong to the whole page (add bar, "Here / Everything inside", filter
chips), each `space-lg` from the next. A hairline across the column, `space-lg`
from the header and from the first control, keeps the thing apart from adding to it.
It gives its controls the gutter.
The filter chip row is the exception: it runs edge to edge so it can scroll
sideways, with the gutter inside the scroller. A page with no such controls
uses the page header alone.

**Selection bar.** Takes the bottom bar's place, at its height, while rows
are selected, and appears at the bottom of the column on wide screens:
the count ("3 selected"), up to three default verb buttons, and Close,
which ends the selection.

Bulk edit selects items on a location's page (Here and Everything inside),
`/search`, views and saved searches, and `/inbox`; locations listed there
have no box. Ticking any row starts the selection; it ends on Close, once an
edit is stored, or on going to another list. The bar's verbs are Move, which
opens the move sheet titled "Move {n} items to"; Tag, which opens "Add tag";
and a More icon button whose menu holds "Change category…", opening the
category sheet with "No category" offered, and "Lend to…" (`user-share`),
opening the Lent to sheet; then Mark in use, Back in place, Sold, Given
away and Thrown away; then, below a rule, Delete (`trash`, `danger`). Each
is one change with Undo: "Moved {n} items to {place}", "Tagged {n} items
{tag}", "Changed the category of {n} items to {category}" or "Removed the
category from {n} items", "Lent {n} items to {name}", "Marked {n} items
{status}" or "{n} items back in place", and "Deleted {n} items". {n} counts
only the items that changed. A move or a delete takes the rows out of the
list at once.

**Task frame.** The frame for a Task. A `bar-height` row with Close at the
gutter and the task's name in `text-heading`; the work area in the column;
one primary button pinned to the bottom, above the safe area, the column's
full width. No navigation and no top bar.

**Gate frame.** The frame for a Gate. A `gate-width` column, centered and
placed in the upper third: Binsight in `text-title`, then the page's fields
and its one primary button. No navigation and no top bar.

**Empty state.** A `text-heading` statement of fact and at most one button,
left-aligned: "Nothing matches "multimeter"", "This bin is empty", "Nothing
is missing". A second sentence only when it adds a fact. No illustration or
large icon. Loading is not an empty state. When standing alone without a
page header, the statement is the page's `h1` in `text-heading`.

**Page state** (`PageState`) **and error boundaries** (`ErrorBoundary`, `RouteError`).
`PageState` wraps a page's main body for `First load` (empty `ground` for
the first second, then "Still loading"), `Backend unreachable` ("Can't
reach Binsight" with "Try again"), `Unknown address or code`, and `Empty`
using `EmptyState`. `Frame` and `TaskFrame` wrap `#content` inside an
`ErrorBoundary` rendering `RouteError` (a `text-title` heading, factual
summary, recovery buttons, and a `ListSection` of navigation destinations on
404 or `ValueRow` status details on 500/offline) so the sidebar, top bar
and bottom bar stay mounted when a page throws or a route misses, with a
router `ErrorBoundary` fallback if the frame itself fails.

## Building it with Mantine

The theme in `frontend/src/lib/theme/` sets all of this once, so pages
never style anything themselves.

| Mantine setting | Value |
| --------------- | ----- |
| `fontFamily`, `fontFamilyMonospace` | The two families, bundled |
| `headings` | `h1` is `text-title`, `h2` is `text-heading`. No others. |
| `fontSizes` | `xs` 14, `sm` 14, `md` 16, `lg` 18, `xl` 24, in rem. `xs` matches `sm` so no 12px text exists. |
| `spacing` | `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `2xl` 32 |
| `radius` | `sm` 2, `md` 6, `lg` 12; `defaultRadius` is `md` |
| `primaryColor` | A ten-shade yellow with `accent` at index 5 and `accent-hover` at 6; `primaryShade` 5 |
| `autoContrast` | On, so text on `accent` is dark |
| `shadows` | Every key is `shadow-overlay` |
| `cssVariablesResolver` | Sets the color tokens per color scheme, and points Mantine's body, text and dimmed colors at `ground`, `ink` and `muted` |
| `components` | Defaults so no page passes them: buttons and inputs 48px high; `ActionIcon` 48px; `Switch` uses `surface`/`control-border` off and `accent`/`on-accent` on; `Badge` outline, `radius-sm`, no upper case; `Modal` and `Drawer` `radius-lg`, no blur; `Notifications` bottom, one at a time, 6 seconds |

In feature code:

- Use theme keys: `c="dimmed"`, `p="lg"`, `radius="sm"`. Text is `Title`
  (order 1 or 2) or `Text` with `size="md"` or `size="sm"`.
- Do not use `Paper` with a shadow, `Loader` in content, or `Popover` for
  explanation.
- Everything else here with no exceptions is enforced by
  `frontend/eslint.config.mjs`: raw colors and pixel sizes, styling and
  help-text props, sizes on buttons and inputs, `color`, variants, banned
  components, icon stroke, and CSS outside `src/components/`.
