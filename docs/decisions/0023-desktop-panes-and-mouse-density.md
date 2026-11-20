# 0023: Wide screens get a location pane, and a mouse gets denser controls

Status: Accepted. Replaces part of [0012](0012-three-width-frame.md) for
widths of 62em and up.

## Context

From 62em the frame showed the phone's one column, `content-max` wide,
beside the side navigation. On a desktop window more than half the screen
stayed empty, every control kept the 48px a thumb needs, and moving between
locations meant going back and forth through pages. The app read as a phone
layout moved onto a computer.

## Decision

- From 75em, location and item pages show a location pane between the side
  navigation and the content: the location tree, the current location lit
  and its branch open. The content column grows to `content-max-wide`.
  `/` has no pane, since it is already the tree.
- An item's record splits into two columns when its column is at least
  760px wide: Details on the left; attachments, links and history on the
  right.
- From 62em, when the main pointer is a mouse (`hover: hover` and
  `pointer: fine`), `touch-min` and `row-min` take their mouse values, and
  a row's handle, add-inside and Move controls show while the row is
  hovered or holds focus.
- From 62em the side navigation can be collapsed to an icon rail, and each
  device remembers the choice.
- From 62em a page header's buttons sit beside its title, and the add bar
  holds its own Add and "Add several".
- Under 62em nothing changes. The three widths and one measure of 0012
  still hold there.

## Why

- A desktop is where the owner looks over the whole home. A tree beside
  the page lets them browse without losing their place, as a file manager
  does.
- A mouse is precise; 48px targets and always-visible handles cost room and
  add clutter it does not need. Touch screens keep thumb sizes.
- Navigation, pane and page side by side crowd a laptop screen; collapsing
  the navigation gives the room back without losing a destination.
- Keeping phones unchanged keeps the one-handed flows exactly as tested.

## Cost

- A fourth arrangement to check by eye, and a pane to keep in step with
  the tree's data.
- Two sizes for every control, chosen by the pointer, so a measurement test
  states which device it runs as.
