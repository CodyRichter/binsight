import time

from sqlalchemy import Engine

from app import models
from app.core.database import open_read_session, open_write_session
from app.features.search import service
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
        found = service.search_home(session, "chager cabel", 50, None)
        elapsed = time.perf_counter() - started
    assert found.count > 0
    # Measured near 20 ms (decision 0016); the bound only catches a large regression.
    assert elapsed < 0.5
