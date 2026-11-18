from fastapi.testclient import TestClient

from tests.photos import photo


def _site(signed_in: TestClient) -> str:
    site_id: str = signed_in.post("/api/locations", json={"name": "Home", "type": "site"}).json()[
        "id"
    ]
    return site_id


def _set_photo(signed_in: TestClient, location_id: str) -> dict[str, str]:
    files = {"photo": ("shelf.jpg", photo(), "image/jpeg")}
    body: dict[str, str] = signed_in.post(f"/api/locations/{location_id}/photo", files=files).json()
    return body


def test_a_location_shows_its_photo(signed_in: TestClient) -> None:
    home = _site(signed_in)
    changed = _set_photo(signed_in, home)
    assert changed["photo_url"].startswith("/api/attachments/")
    assert signed_in.get(f"/api/locations/{home}").json()["photo_url"] == changed["photo_url"]
    assert signed_in.get(changed["photo_url"]).headers["content-type"] == "image/jpeg"


def test_a_new_photo_replaces_the_old_and_undo_puts_the_old_back(signed_in: TestClient) -> None:
    home = _site(signed_in)
    old = _set_photo(signed_in, home)["photo_url"]
    replaced = _set_photo(signed_in, home)
    assert replaced["photo_url"] != old
    undone = signed_in.post(f"/api/history/{replaced['history_entry_id']}/undo")
    assert undone.status_code == 200
    assert signed_in.get(f"/api/locations/{home}").json()["photo_url"] == old


def test_removing_a_photo_can_be_undone(signed_in: TestClient) -> None:
    home = _site(signed_in)
    photo_url = _set_photo(signed_in, home)["photo_url"]
    removed = signed_in.delete(f"/api/locations/{home}/photo").json()
    assert removed["photo_url"] is None
    signed_in.post(f"/api/history/{removed['history_entry_id']}/undo")
    assert signed_in.get(f"/api/locations/{home}").json()["photo_url"] == photo_url


def test_undoing_a_removal_is_refused_once_another_photo_was_set(signed_in: TestClient) -> None:
    home = _site(signed_in)
    _set_photo(signed_in, home)
    removed = signed_in.delete(f"/api/locations/{home}/photo").json()
    _set_photo(signed_in, home)
    undone = signed_in.post(f"/api/history/{removed['history_entry_id']}/undo")
    assert undone.json()["error"]["code"] == "changed_since"


def test_a_location_without_a_photo_has_none_to_remove(signed_in: TestClient) -> None:
    home = _site(signed_in)
    response = signed_in.delete(f"/api/locations/{home}/photo")
    assert response.json()["error"]["code"] == "attachment_not_found"
