from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models
from app.core.pagination import Page, counted_page, decode_offset
from app.core.table_rows import ExportTables, table_rows
from app.features.history import service as history
from app.features.items import service as items
from app.features.views.saved_searches import create_saved_search as create_saved_search
from app.features.views.saved_searches import delete_saved_search as delete_saved_search
from app.features.views.saved_searches import get_saved_search as get_saved_search
from app.features.views.saved_searches import list_saved_search_rows as list_saved_search_rows
from app.features.views.saved_searches import list_saved_searches as list_saved_searches
from app.features.views.saved_searches import update_saved_search as update_saved_search
from app.features.views.schemas import ViewName, ViewSummary

TITLES: dict[ViewName, str] = {
    "lent-out": "Lent out",
    "missing": "Missing",
    "warranty-ending": "Warranty expiring soon",
    "return-closing": "Return window closing",
    "recently-added": "Recently added",
    "recently-moved": "Recently moved",
    "possible-duplicates": "Possible duplicates",
    "archive": "Archive",
}
RECENT = timedelta(days=30)


def _moved(session: Session, now: datetime) -> list[str]:
    return history.recently_moved_item_ids(session, now - RECENT)


def _count(session: Session, view: ViewName, now: datetime) -> int:
    if view == "recently-moved":
        return items.count_items_in_order(session, _moved(session, now))
    return items.count_view_items(session, view, now)


def list_views(
    session: Session, now: datetime, limit: int, cursor: str | None
) -> Page[ViewSummary]:
    """Every built-in view across the whole home, each with how many it lists."""
    summaries = [
        ViewSummary(view=view, title=title, count=_count(session, view, now))
        for view, title in TITLES.items()
    ]
    return counted_page(summaries, decode_offset(cursor) if cursor else 0, limit)


def list_view_rows(
    session: Session, view: ViewName, now: datetime, limit: int, cursor: str | None
) -> Page[items.Item]:
    """The items one built-in view lists."""
    if view == "recently-moved":
        return items.list_items_in_order(session, _moved(session, now), limit, cursor)
    return items.list_view_items(session, view, now, limit, cursor)


def export_tables(session: Session) -> ExportTables:
    """Every saved search as stored, for the export."""
    return {"saved_searches": table_rows(session, models.SavedSearch)}
