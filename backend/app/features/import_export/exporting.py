import csv
import json
import tempfile
import zipfile
from collections import defaultdict
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.settings import Settings
from app.core.table_rows import ExportTables
from app.features.attachments import service as attachments
from app.features.attachments.service import FileOnDisk
from app.features.checks import service as checks
from app.features.history import service as history
from app.features.import_export.schemas import COLUMNS
from app.features.items import service as items
from app.features.labels import service as labels
from app.features.locations import service as locations
from app.features.locations.service import Location
from app.features.views import service as views

FORMAT_VERSION = 1


def _tables(session: Session) -> ExportTables:
    # The owner, sessions and credentials are secrets, not the household's things, so stay out.
    return {
        **locations.export_tables(session),
        **items.export_tables(session),
        **attachments.export_tables(session),
        **labels.export_tables(session),
        **checks.export_tables(session),
        **views.export_tables(session),
        **history.export_tables(session),
    }


def _csv(columns: tuple[str, ...], rows: list[dict[str, Any]]) -> str:
    text = StringIO()
    writer = csv.DictWriter(text, fieldnames=columns)
    writer.writeheader()
    writer.writerows(rows)
    return text.getvalue()


def _shown_path(location: Location) -> str:
    return " > ".join(step.name for step in location.path)


def _price(cents: int | None) -> str | None:
    return None if cents is None else f"{cents / 100:.2f}"


def _item_rows(tables: ExportTables, places: list[Location]) -> list[dict[str, Any]]:
    paths = {place.id: _shown_path(place) for place in places}
    categories = {row["id"]: row["name"] for row in tables["categories"]}
    tags: defaultdict[str, list[str]] = defaultdict(list)
    for row in tables["item_tags"]:
        tags[row["item_id"]].append(row["tag"])
    return [
        {
            **{column: row.get(column) for column in COLUMNS},
            "location": paths.get(row["home_location_id"] or ""),
            "category": categories.get(row["category_id"] or ""),
            "tags": "; ".join(sorted(tags[row["id"]])),
            "price": _price(row["price_cents"]),
        }
        for row in tables["items"]
        if row["deleted_at"] is None
    ]


def _location_rows(places: list[Location]) -> list[dict[str, Any]]:
    return [
        {
            "location": _shown_path(place),
            "type": place.type.value,
            "label_code": place.label_code,
            "summary": place.summary,
            "last_checked_at": place.last_checked_at.isoformat() if place.last_checked_at else None,
        }
        for place in places
    ]


LOCATION_COLUMNS = ("location", "type", "label_code", "summary", "last_checked_at")


def export_everything(session: Session, settings: Settings, now: datetime) -> FileOnDisk:
    """Everything in the home as one zip: the data as JSON and CSV, with every photo and file."""
    tables = _tables(session)
    places = locations.list_locations(session).locations
    document = {"format_version": FORMAT_VERSION, "exported_at": now.isoformat(), **tables}
    handle, name = tempfile.mkstemp(prefix="binsight-export-", suffix=".zip")
    path = Path(name)
    with open(handle, "wb") as raw, zipfile.ZipFile(raw, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("binsight.json", json.dumps(document, indent=2, ensure_ascii=False))
        archive.writestr("items.csv", _csv(COLUMNS, _item_rows(tables, places)))
        archive.writestr("locations.csv", _csv(LOCATION_COLUMNS, _location_rows(places)))
        for row in tables["attachments"]:
            if row["path"] is not None:
                archive.write(settings.data_directory / row["path"], row["path"])
    return FileOnDisk(
        path=path,
        content_type="application/zip",
        filename=f"binsight-export-{now.date().isoformat()}.zip",
    )
