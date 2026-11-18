import time
from datetime import date

from sqlalchemy import Engine

from app import models
from app.core.database import open_read_session, open_write_session
from app.features.search import service
from app.features.search.schemas import Search
from tests import builders

WORDS = [
    "hdmi",
    "usb",
    "cable",
    "charger",
    "drill",
    "battery",
    "lamp",
    "filter",
    "tape",
    "hammer",
    "rope",
    "tent",
    "ladder",
    "hose",
]


def test_a_search_over_five_thousand_items_is_quick(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        site = builders.location(session).id
        bins = [builders.location(session, f"Bin {number}", site).id for number in range(300)]
        session.add_all(
            models.Item(
                id=f"item-{number}",
                name=f"{WORDS[number % 14]} {WORDS[number * 7 % 13]} {number}",
                quantity=1,
                home_location_id=bins[number % 300],
                created_at=builders.NOW,
                updated_at=builders.NOW,
            )
            for number in range(5000)
        )
    with open_read_session(migrated_engine) as session:
        started = time.perf_counter()
        found = service.search_home(
            session, Search(query="chager cabel"), date(2026, 11, 16), 50, None
        )
        elapsed = time.perf_counter() - started
    assert found.count > 0
    # Near 150 ms on an M2 Pro and three times that on CI runners; this only catches a large
    # regression.
    assert elapsed < 1.0
