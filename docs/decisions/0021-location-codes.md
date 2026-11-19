# 0021: A location is known by its code

Status: Accepted. Replaces the code series and blank labels in 0004.

## Context

A location's page was at `/locations/{22-character identifier}`, while its
label carried a separate code from one increasing series (`B-014`) that
could be blank, claimed, unclaimed or moved to another location on merge.
The address bar, the printed code and the location's identity were three
different things. Nothing was in production, so no printed label depended
on the old scheme.

## Decision

- Every location is given a code when it is made: six characters from
  A–Z and 0–9, written with a hyphen after the third, such as `K7Q-4MZ`.
  It is drawn at random, so it says nothing about the location.
- The code is the location's identifier. It is the address of its page
  (`/locations/K7Q-4MZ`), what its QR code holds (`/l/K7Q-4MZ`, which 0004
  keeps permanent and which opens that page), and what its label prints.
- A code is never drawn if it spells a word on the blocklist
  (`backend/app/features/locations/blocked_words.txt`), read as written or
  with digits taken as the letters they look like (`0` as O, `5` as S...).
- Codes are typed in any case and with or without the hyphen.
- There are no blank labels and no claiming. A location's label can be
  printed as soon as the location exists. Labels are not a table.
- A code is never given to another location. A deleted or merged location
  keeps its code, and its label opens it, marked deleted, with Restore.

## Why

- One short code for the page, the sticker and search is easier to trust
  than three identifiers.
- About 2.2 billion codes leave room for any household, and a random draw
  needs no counter.
- A code printed on a sticker cannot be recalled, so offensive ones are
  refused at the draw.

## Cost

- Labels cannot be printed ahead of time for locations that do not exist
  yet; add the location, then print its label.
- Merging no longer moves a label to the location merged into: scanning the
  merged one's label opens it, deleted.
- Undoing a location's creation removes its row, so a label printed for it
  in between opens nothing.
- Look-alike characters (0 and O, 1 and I) are all in the alphabet. The
  label's font tells them apart.
