# 0004: Label addresses and codes are permanent

Status: Accepted, amended by [0021](0021-location-codes.md): codes are each
location's random identifier, such as `K7Q-4MZ`, and there are no blank labels.

## Context

Labels are printed and stuck on physical bins. Anything encoded on a label
cannot be updated later without reprinting and relabeling the house.

## Decision

- A QR code holds the app's address followed by `/l/` and the code, for
  example `https://binsight.example.com/l/B-014`.
- The app's address is set once per install and treated as permanent.
- The `/l/{code}` path never changes.
- Codes come from one increasing series (`B-001`, `B-002`, ...) and are
  never reused, even after their location is deleted.
- The code carries no meaning. The `B` is fixed and does not stand for a
  location type.

## Why

- A scan with the phone's own camera opens the right page with no app and
  no lookup step.
- Blank labels can be printed before anyone knows what they will go on,
  which only works if the code says nothing about the location.
- Never reusing a code means an old label can never open the wrong bin.

## Cost

- QR codes are specific to one install. Moving to a new address means
  reprinting labels, or keeping the old address redirecting forever.
- The address must be chosen carefully before the first label is printed.
- The `/l/` path is frozen even if the rest of the app's addresses change.
