from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.core.errors import AppError
from app.core.identifiers import new_identifier
from app.core.pagination import Page, counted_page, decode_offset
from app.features.history import service as history
from app.features.search import service as search
from app.features.search.service import Search, SearchResults
from app.features.views.schemas import (
    NewSavedSearch,
    SavedSearch,
    SavedSearchChanges,
    SavedSearchCreated,
    SavedSearchDeleted,
    SavedSearchUpdated,
)
from app.models import Actor

FIELDS = ("name", "query", "location_id", "category", "tag", "status", "warranty", "pinned")


def _row(session: Session, saved_search_id: str) -> models.SavedSearch:
    row = session.get(models.SavedSearch, saved_search_id)
    if row is None:
        raise AppError(404, "saved_search_not_found", "That saved search does not exist.")
    return row


def _fields(row: models.SavedSearch) -> dict[str, Any]:
    return {field: getattr(row, field) for field in FIELDS}


def _search(row: models.SavedSearch) -> Search:
    return Search.model_validate(_fields(row))


def _results(
    session: Session, row: models.SavedSearch, now: datetime, limit: int, cursor: str | None
) -> SearchResults:
    return search.search_home(session, _search(row), now.date(), limit, cursor)


def _shaped(session: Session, row: models.SavedSearch, now: datetime) -> SavedSearch:
    count = _results(session, row, now, 1, None).count
    return SavedSearch(
        **_search(row).model_dump(),
        id=row.id,
        name=row.name,
        pinned=row.pinned,
        count=count,
        created_at=row.created_at,
    )


def create_saved_search(
    session: Session, new: NewSavedSearch, actor: Actor, now: datetime
) -> SavedSearchCreated:
    """Keep a search, with its words and filters, under a name."""
    row = models.SavedSearch(
        id=new_identifier(), **new.model_dump(), pinned=False, created_at=now, updated_at=now
    )
    session.add(row)
    session.flush()
    change = history.RecordChange("saved_search", row.id, None, _fields(row))
    entry_id = history.record(session, actor, "saved_search.created", [change], now)
    return SavedSearchCreated(**_shaped(session, row, now).model_dump(), history_entry_id=entry_id)


def _action(changes: SavedSearchChanges) -> str:
    if changes.name is not None:
        return "saved_search.renamed"
    return "saved_search.pinned" if changes.pinned else "saved_search.unpinned"


def update_saved_search(
    session: Session, saved_search_id: str, changes: SavedSearchChanges, actor: Actor, now: datetime
) -> SavedSearchUpdated:
    """Rename a saved search, or pin or unpin it."""
    row = _row(session, saved_search_id)
    wanted = changes.model_dump(exclude_none=True)
    changed = {field: value for field, value in wanted.items() if getattr(row, field) != value}
    if not changed:
        raise AppError(409, "nothing_changed", "The saved search already reads that way.")
    before = {field: getattr(row, field) for field in changed}
    for field, value in changed.items():
        setattr(row, field, value)
    row.updated_at = now
    change = history.RecordChange("saved_search", row.id, before, changed)
    entry_id = history.record(session, actor, _action(changes), [change], now)
    return SavedSearchUpdated(**_shaped(session, row, now).model_dump(), history_entry_id=entry_id)


def delete_saved_search(
    session: Session, saved_search_id: str, actor: Actor, now: datetime
) -> SavedSearchDeleted:
    """Remove a saved search. The items it found are not changed."""
    row = _row(session, saved_search_id)
    change = history.RecordChange("saved_search", row.id, _fields(row), {})
    session.delete(row)
    session.flush()
    entry_id = history.record(session, actor, "saved_search.deleted", [change], now)
    return SavedSearchDeleted(history_entry_id=entry_id)


def get_saved_search(session: Session, saved_search_id: str, now: datetime) -> SavedSearch:
    """One saved search, with how many results it finds now."""
    return _shaped(session, _row(session, saved_search_id), now)


def list_saved_searches(
    session: Session, now: datetime, limit: int, cursor: str | None
) -> Page[SavedSearch]:
    """Every saved search, pinned ones first, then by name, each with its count."""
    rows = list(session.scalars(select(models.SavedSearch)))
    rows.sort(key=lambda row: (not row.pinned, row.name.lower(), row.id))
    page = counted_page(rows, decode_offset(cursor) if cursor else 0, limit)
    return Page(
        items=[_shaped(session, row, now) for row in page.items], next_cursor=page.next_cursor
    )


def list_saved_search_rows(
    session: Session, saved_search_id: str, now: datetime, limit: int, cursor: str | None
) -> SearchResults:
    """What a saved search finds now, best match first."""
    return _results(session, _row(session, saved_search_id), now, limit, cursor)
