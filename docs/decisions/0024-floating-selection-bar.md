# 0024: The selection bar floats over the content column

Status: Accepted. Amends the bars rule of the
[design language](../design-language.md) for this one bar.

## Context

The selection bar took the bottom bar's place on a phone and was a footer
on wide screens: `ground`, a hairline above it, the full width of the
window. It read as more page chrome, so owners missed that the buttons act
on the ticked rows, and beside the location pane it ran under the pane,
which has nothing to select.

## Decision

- While rows are selected, the selection bar floats over the foot of the
  content column at every width, drawn like a toast: `inverse`,
  `radius-md` and `shadow-overlay`.
- It keeps to the column's gutter and never covers the location pane or
  the side navigation.
- On a phone the bottom bar stays under it; a toast floats above both.
- The page gains bottom padding while it shows, so no row is left under it.

## Why

- A floating, dark bar is what a toolbar for a selection looks like
  elsewhere, and it sits beside the rows it acts on.
- Keeping the bottom bar on a phone means selecting no longer changes the
  navigation under the thumb.

## Cost

- One exception to "bars are never shadowed", and a third floating thing,
  after sheets and toasts, whose stacking has to be kept in order.
- The toast's resting place now depends on whether rows are selected.
