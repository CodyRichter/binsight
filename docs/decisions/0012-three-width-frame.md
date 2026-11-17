# 0012: The frame has three widths and one column, and text starts at 14px

Status: Accepted

## Context

The frame had two arrangements switched at 62em. Between about 740px and
992px the phone arrangement was used with the content stopped at
`content-max` against the left edge, while the bars spanned the window. On
wide screens the search field, the navigation and the content each had
their own left edge, and Scan and Add sat at the window's far right. The
bottom bar's labels were 12px, the smallest text on the most used control.

## Decision

- The frame has three widths: under 48em, 48em to 62em, and 62em and up,
  as set out in [the design language](../design-language.md#the-frame).
- Every width has one content column, at most `content-max`. The top bar's
  contents, the page, the toast and the bottom bar's slots share its edges.
  From 48em to 62em it is centered; from 62em it sits beside a
  full-height side navigation.
- 14px is the smallest text. `text-nav` is 14px, and every text style is
  set in rem so it follows the browser's text size.

## Why

- One measure means one set of edges to check, and the eye finds the
  search field, the title and the rows on the same line at every width.
- Text read at arm's length, often in a dim garage, should not go below
  14px, and the owner's own text size setting should be honored.

## Cost

- A third arrangement to check by eye and in the screenshot tests.
- The bottom bar's labels take more room; five slots still fit at 320px.
