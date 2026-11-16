# Acceptance criteria

The five core flows from the [requirements](requirements.md), written as
steps and results. Each flow has one end-to-end test in `frontend/e2e/`, run
at phone width, that follows these steps exactly. A flow is not done until
its test passes.

A flow's test is started at the step named for it in the
[build order](build-order.md) and is complete by step 6. A result that
depends on a later step joins the test at that step.

"Tap" counts start once the page named in the first step is showing.
Typing a name is not counted as a tap.

## Setup used by every flow

- Site `Home` contains room `Garage`, which contains shelf `Shelf 2`.
- `Shelf 2` contains bin `Cables` with label `B-014`, and bin `Tools` with
  label `B-015`.
- `Cables` holds `HDMI cable` (quantity 3) and `USB-C charger`.
- The owner is signed in.

## 1. Scan a bin label and see what's in it

1. Open the label address for `B-014`.

Results:

- The page for `Cables` shows without any further tap.
- The path reads `Home > Garage > Shelf 2 > Cables`.
- Both items show, with `HDMI cable` showing quantity 3.
- Quick add and move this bin are both visible without scrolling on a
  phone.

Also:

- A blank label's address opens a page offering to claim it for an existing
  or new location.
- An unknown code opens a page saying so, with search.
- A signed-out owner is sent to sign in and then lands on the same bin.

## 2. Scan a bin label and add things to it

1. Open the label address for `B-014`.
2. Tap quick add.
3. Type `Ethernet cable` and submit.

Results:

- `Ethernet cable` appears in the list immediately, with quantity 1.
- Its home location is `Cables`. No other field was asked for.
- The add field is ready for the next name without another tap.
- An undo offer shows; taking it removes the item.

Also:

- Batch: pasting three lines into the add field creates three items.
- Photo: taking a photo instead of typing creates an item with that photo
  and no name, which appears in the inbox.
- Typing `HDMI cable` offers "add to existing" and, if taken, raises the
  existing item's quantity to 4 instead of creating a second item.

## 3. Search for a thing and see where it is

1. From any page, tap the search box.
2. Type `hdmi`.

Results:

- `HDMI cable` appears as results update while typing, with no submit.
- The result shows the full path `Home > Garage > Shelf 2 > Cables`, and a
  thumbnail if there is a photo.

Also:

- `hdmi cabel` (a typo) still finds it.
- `cable hdmi` (words reversed) still finds it.
- `b14` finds the bin `Cables`.
- A search with no results offers to add an item with that name.

## 4. Move a thing or a whole bin

Moving an item:

1. On the page for `Cables`, tap move on `USB-C charger`.
2. Choose `Tools`.

Results:

- `USB-C charger` leaves the `Cables` list immediately and its path reads
  `Home > Garage > Shelf 2 > Tools`.
- An undo offer shows; taking it puts the item back.
- The item's history shows the move, with the actor `app`.

Moving a bin by scanning:

1. On the page for `Cables`, tap move this bin.
2. Scan the label of the destination location.

Results:

- `Cables` and everything in it now sit under the scanned location.
- Every item in it shows the new path. No item was changed individually.
- One history entry records the move and one undo reverses it.

Also:

- A location cannot be moved into itself or into anything beneath it; the
  attempt is refused with a clear message.

## 5. Ask Claude any of the above through MCP

Using the MCP tools with a valid MCP credential:

| Request                              | Result                                   |
| ------------------------------------ | ---------------------------------------- |
| What is in `B-014`?                  | Both items and the bin's path.           |
| Add `Ethernet cable` to `B-014`.     | The item exists with home location `Cables`. |
| Where is the HDMI cable?             | `Home > Garage > Shelf 2 > Cables`, code `B-014`, quantity 3. |
| Do I own a multimeter?               | A clear no, not an error.                |
| Move the USB-C charger to `B-015`.   | The item's home location is `Tools`.     |

Results:

- Every change made this way has the actor `mcp` in history.
- Every change is visible in the app without a restart.
- Deleting an item does not happen until the confirmation step is
  completed.
- A revoked MCP credential is refused, and the app login is unaffected.
- Every tool reaches the same result as the matching action in the app.
