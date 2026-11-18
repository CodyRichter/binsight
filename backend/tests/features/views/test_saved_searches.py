from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.database import open_read_session, open_write_session
from app.core.errors import AppError
from app.core.settings import Settings
from app.features.history import service as history
from app.features.items import service as items
from app.features.items.schemas import ItemChanges
from app.features.search.schemas import ItemResult
from app.features.views import service
from app.features.views.schemas import NewSavedSearch, SavedSearchChanges
from app.models import Actor
from tests import builders
from tests.builders import AcceptanceHome

LATER = builders.NOW + timedelta(days=1)


@pytest.fixture
def home(migrated_engine: Engine) -> AcceptanceHome:
    with open_write_session(migrated_engine) as session:
        home = builders.acceptance_home(session)
        cables = ItemChanges(category="Cables")
        items.update_item(session, home.hdmi_cable, cables, Actor.app, LATER)
        return home


def _save(engine: Engine, name: str, **search: str) -> tuple[str, str]:
    with open_write_session(engine) as session:
        made = service.create_saved_search(
            session, NewSavedSearch.model_validate({"name": name, **search}), Actor.app, LATER
        )
    return made.id, made.history_entry_id


def _change(engine: Engine, saved_search_id: str, **changes: str | bool) -> str:
    with open_write_session(engine) as session:
        changed = service.update_saved_search(
            session, saved_search_id, SavedSearchChanges.model_validate(changes), Actor.app, LATER
        )
    return changed.history_entry_id


def _listed(engine: Engine) -> list[tuple[str, bool, int]]:
    with open_read_session(engine) as session:
        listed = service.list_saved_searches(session, LATER, 50, None).items
    return [(each.name, each.pinned, each.count) for each in listed]


def _undo(engine: Engine, settings: Settings, entry_id: str) -> None:
    with open_write_session(engine) as session:
        history.undo(session, settings, entry_id, Actor.app, LATER + timedelta(hours=1))


@pytest.mark.usefixtures("home")
def test_a_saved_search_finds_what_its_filters_keep(migrated_engine: Engine) -> None:
    saved_id, _ = _save(migrated_engine, "All cables", category="cables")
    with open_read_session(migrated_engine) as session:
        found = service.list_saved_search_rows(session, saved_id, LATER, 50, None)
    assert [each.item.name for each in found.results if isinstance(each, ItemResult)] == [
        "HDMI cable"
    ]
    assert _listed(migrated_engine) == [("All cables", False, 1)]


@pytest.mark.usefixtures("home")
def test_pinned_searches_are_listed_first(migrated_engine: Engine) -> None:
    _save(migrated_engine, "Anything HDMI", query="hdmi")
    pinned_id, _ = _save(migrated_engine, "Chargers", query="charger")
    _change(migrated_engine, pinned_id, pinned=True)
    assert _listed(migrated_engine) == [("Chargers", True, 1), ("Anything HDMI", False, 1)]


@pytest.mark.usefixtures("home")
def test_each_change_to_a_saved_search_is_undone(
    migrated_engine: Engine, settings: Settings
) -> None:
    saved_id, created = _save(migrated_engine, "Cables", category="Cables")
    renamed = _change(migrated_engine, saved_id, name="All cables")
    pinned = _change(migrated_engine, saved_id, pinned=True)
    _undo(migrated_engine, settings, pinned)
    _undo(migrated_engine, settings, renamed)
    assert _listed(migrated_engine) == [("Cables", False, 1)]
    _undo(migrated_engine, settings, created)
    assert _listed(migrated_engine) == []


@pytest.mark.usefixtures("home")
def test_a_deleted_saved_search_comes_back_with_undo(
    migrated_engine: Engine, settings: Settings
) -> None:
    saved_id, _ = _save(migrated_engine, "All cables", category="Cables")
    _change(migrated_engine, saved_id, pinned=True)
    with open_write_session(migrated_engine) as session:
        deleted = service.delete_saved_search(session, saved_id, Actor.app, LATER)
    assert _listed(migrated_engine) == []
    _undo(migrated_engine, settings, deleted.history_entry_id)
    assert _listed(migrated_engine) == [("All cables", True, 1)]


@pytest.mark.usefixtures("home")
def test_a_change_that_changes_nothing_is_refused(migrated_engine: Engine) -> None:
    saved_id, _ = _save(migrated_engine, "All cables", category="Cables")
    with pytest.raises(AppError) as refused:
        _change(migrated_engine, saved_id, pinned=False)
    assert refused.value.code == "nothing_changed"


def test_saved_searches_through_the_api(signed_in: TestClient) -> None:
    made = signed_in.post("/api/saved-searches", json={"name": "HDMI", "query": "hdmi"})
    assert made.status_code == 201
    saved_id = made.json()["id"]
    assert signed_in.get(f"/api/saved-searches/{saved_id}").json()["name"] == "HDMI"
    assert signed_in.get(f"/api/saved-searches/{saved_id}/results").json()["count"] == 0
    assert signed_in.delete(f"/api/saved-searches/{saved_id}").status_code == 200
    missing = signed_in.get(f"/api/saved-searches/{saved_id}")
    assert missing.json()["error"]["code"] == "saved_search_not_found"
