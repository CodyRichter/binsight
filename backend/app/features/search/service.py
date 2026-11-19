import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

from sqlalchemy.orm import Session

from app.core.pagination import decode_offset, encode_offset
from app.features.items import service as items
from app.features.items.service import ItemFilters
from app.features.locations import service as locations
from app.features.search.matching import (
    EXACT,
    Word,
    best_score,
    marks,
    match_vocabulary,
    words,
)
from app.features.search.schemas import ItemResult, LocationResult, Mark
from app.features.search.schemas import Search as Search  # re-exported: saved searches hold one
from app.features.search.schemas import SearchResults as SearchResults

# A name counts double against other words, so a bin called "Cables" beats one that mentions them.
NAME_WEIGHT = 2
CODE_SCORE = EXACT * NAME_WEIGHT
# A code is typed as one word, so the hyphen in K7Q-4MZ must not split it in two.
CODE_HYPHEN = re.compile(r"\b([a-z0-9]{3})-(?=[a-z0-9]{3}\b)", re.IGNORECASE)


@dataclass(frozen=True)
class _Found:
    kind: Literal["item", "location"]
    id: str
    name: str
    score: int
    marks: list[Mark]


@dataclass(frozen=True)
class _Candidate:
    kind: Literal["item", "location"]
    id: str
    name: list[Word]
    name_text: str
    # A location's summary, or an item's details and tags.
    details: list[Word]
    code: str | None


def _candidates(session: Session, filters: ItemFilters, today: date) -> list[_Candidate]:
    found = [
        _Candidate("item", item.id, words(item.name), item.name, words(item.details), None)
        for item in items.searchable_items(session, filters, today)
    ]
    # Locations have no category, tag, status or warranty, so those filters leave them out.
    if not filters.only_location():
        return found
    within = (
        set(locations.location_ids_within(session, filters.location_id))
        if filters.location_id
        else None
    )
    for location in locations.searchable_locations(session):
        if within is not None and location.id not in within:
            continue
        details = words(location.summary or "")
        name = words(location.name)
        found.append(_Candidate("location", location.id, name, location.name, details, location.id))
    return found


def _word_score(candidate: _Candidate, found: dict[str, int], code: str) -> int:
    if code == candidate.code:
        return CODE_SCORE
    return max(
        best_score(found, candidate.name) * NAME_WEIGHT, best_score(found, candidate.details)
    )


def _score(
    candidate: _Candidate, query: list[str], found: list[dict[str, int]], codes: list[str]
) -> _Found | None:
    total = 0
    for word_found, code in zip(found, codes, strict=True):
        score = _word_score(candidate, word_found, code)
        if not score:
            return None
        total += score
    spans = marks(query, found, candidate.name)
    return _Found(candidate.kind, candidate.id, candidate.name_text, total, spans)


def _everything_kept(candidates: list[_Candidate]) -> list[_Found]:
    found = [_Found(each.kind, each.id, each.name_text, 0, []) for each in candidates]
    return sorted(found, key=lambda each: (each.kind != "item", each.name.lower(), each.id))


def _ranked(session: Session, query: str, filters: ItemFilters, today: date) -> list[_Found]:
    query_words = [word.text for word in words(CODE_HYPHEN.sub(r"\1", query))]
    if not query_words and not filters.any_set():
        return []
    candidates = _candidates(session, filters, today)
    if not query_words:
        return _everything_kept(candidates)
    vocabulary = {word.text for each in candidates for word in each.name + each.details}
    found = match_vocabulary(query_words, vocabulary)
    codes = [locations.location_code(word) for word in query_words]
    scored = [_score(candidate, query_words, found, codes) for candidate in candidates]
    matched = [each for each in scored if each is not None]
    return sorted(
        matched, key=lambda each: (-each.score, each.kind != "item", len(each.name), each.name)
    )


def _shaped(session: Session, page: list[_Found]) -> list[ItemResult | LocationResult]:
    item_ids = [each.id for each in page if each.kind == "item"]
    location_ids = [each.id for each in page if each.kind == "location"]
    found_items = dict(zip(item_ids, items.get_items(session, item_ids), strict=True))
    # Reading locations builds the whole tree for its counts, so skip it when none are shown.
    shown = locations.get_locations(session, location_ids) if location_ids else []
    found_locations = dict(zip(location_ids, shown, strict=True))
    return [
        ItemResult(kind="item", item=found_items[each.id], marks=each.marks)
        if each.kind == "item"
        else LocationResult(kind="location", location=found_locations[each.id], marks=each.marks)
        for each in page
    ]


def search_home(
    session: Session, search: Search, today: date, limit: int, cursor: str | None
) -> SearchResults:
    """Find items and locations by name, details or code, despite typos, kept to the filters."""
    start = decode_offset(cursor) if cursor else 0
    filters = ItemFilters.model_validate(search.model_dump(exclude={"query"}))
    ranked = _ranked(session, search.query, filters, today)
    end = start + limit
    return SearchResults(
        results=_shaped(session, ranked[start:end]),
        next_cursor=encode_offset(end) if end < len(ranked) else None,
        count=len(ranked),
    )


def results_for(results: SearchResults, visitor: bool) -> SearchResults:
    """Search results as someone sees them, items' private details left out for a visitor."""
    shown = [
        result.model_copy(update={"item": items.item_for(result.item, visitor)})
        if isinstance(result, ItemResult)
        else result
        for result in results.results
    ]
    return results.model_copy(update={"results": shown})
