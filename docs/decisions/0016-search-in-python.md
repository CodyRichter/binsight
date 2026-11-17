# 0016: Search scores names in Python, with no index

Status: Accepted

## Context

Search must be typo tolerant, match words in any order, find a label code
typed loosely (`b14` for `B-014`), and feel instant at a few thousand items
(requirements). The backend has no caches or background workers, and a
feature reads another's data only through its service.

## Decision

- Each search reads every named item and every location through the
  `items` and `locations` services and scores them in Python. No index
  table, no extra dependency, nothing kept between requests.
- Names are split into words of letters and digits, lower-cased, with
  accents removed. A typed word matches a word in the home exactly (best),
  as its start, or with a typo: at most one edit for 4 to 7 letters, two
  for 8 or more, counting a swap of neighbouring letters as one, against
  the word or its same-length start. Words of three letters or fewer, and
  words with digits, never match by typo.
- Each typed word is matched once against the distinct words in the home;
  names are then scored by lookup. Every typed word must match. A name
  counts double a location's summary, and a typed label code matching a
  location's label scores highest.

## Measured

On an Apple M2 Pro, through the real service with SQLite, 5,000 items in
300 bins whose names use 3,000 distinct random words (more than a home
has): 25 to 40 ms a query, reading included. A test fails if one search
over 5,000 items takes over half a second.

## Rejected

- SQLite FTS5 with the trigram tokenizer: it finds substrings, not typos
  (`cabel` shares one trigram with `cable`), so Python scoring is needed
  anyway, and the index has to be kept in step with the items table.
- rapidfuzz: faster, but a compiled dependency for time we do not need.
- spellfix1: not built into SQLite.

## Cost

- Time grows with the number of items and distinct words. Revisit this if
  a query passes 100 ms at 5,000 items.
- Ranking is simple word scoring, not relevance tuned on real data.
