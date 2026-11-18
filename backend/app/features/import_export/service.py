from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.features.history import service as history
from app.features.import_export.csv_rows import MAX_CSV_BYTES as MAX_CSV_BYTES
from app.features.import_export.csv_rows import read_rows, rows_invalid
from app.features.import_export.exporting import export_everything as export_everything
from app.features.import_export.placing import Placing, Spot, new_location_type, place_rows
from app.features.import_export.schemas import ImportDone, ImportPreview, ImportRow
from app.features.items import service as items
from app.features.locations import service as locations
from app.models import Actor

PREVIEWED_NAMES = 20


def _planned(session: Session, raw: bytes) -> tuple[list[ImportRow], Placing]:
    rows = read_rows(raw)
    placing = place_rows(session, rows)
    if placing.problems:
        raise rows_invalid(placing.problems)
    return rows, placing


def preview_import(session: Session, raw: bytes) -> ImportPreview:
    """What importing a CSV file would add, refused as the import itself would be."""
    rows, placing = _planned(session, raw)
    return ImportPreview(
        items_to_create=len(rows),
        locations_to_create=[place.shown_path for place in placing.new_places],
        first_item_names=[row.item.name for row in rows[:PREVIEWED_NAMES]],
    )


def _make_locations(
    session: Session, placing: Placing, now: datetime
) -> tuple[dict[int, str | None], list[history.RecordChange]]:
    made: dict[str, str] = {}
    changes = []

    def location_id(spot: Spot | None) -> str | None:
        return None if spot is None else (made[spot[1]] if spot[0] == "new" else spot[1])

    for place in placing.new_places:
        new = locations.NewLocation(
            name=place.name, type=new_location_type(place), parent_id=location_id(place.parent)
        )
        change = locations.make_location(session, new, now)
        made[place.key] = change.record_id
        changes.append(change)
    return {row: location_id(spot) for row, spot in placing.spots.items()}, changes


def import_items(session: Session, raw: bytes, actor: Actor, now: datetime) -> ImportDone:
    """Add every item in a CSV file, making the locations it names, as one change to undo."""
    rows, placing = _planned(session, raw)
    homes, location_changes = _make_locations(session, placing, now)
    # A microsecond apart, so lists show them in the file's order.
    item_changes = [
        items.make_item(
            session,
            row.item.model_copy(update={"home_location_id": homes[row.row]}),
            now + timedelta(microseconds=order),
        )
        for order, row in enumerate(rows)
    ]
    entry_id = history.record(
        session, actor, "items.imported", [*item_changes, *location_changes], now
    )
    return ImportDone(
        items_created=len(item_changes),
        locations_created=len(location_changes),
        history_entry_id=entry_id,
    )
