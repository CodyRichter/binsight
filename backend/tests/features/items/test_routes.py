from fastapi.testclient import TestClient

from app.core.settings import Settings
from tests.photos import photo

ITEMS = "/api/items"


def _home(client: TestClient) -> str:
    location_id: str = client.post("/api/locations", json={"name": "Home", "type": "site"}).json()[
        "id"
    ]
    return location_id


def test_creating_an_item_answers_with_it_and_its_history_entry(signed_in: TestClient) -> None:
    home = _home(signed_in)
    response = signed_in.post(ITEMS, json={"name": "HDMI cable", "home_location_id": home})
    assert response.status_code == 201
    body = response.json()
    assert body["history_entry_id"]
    assert body["created_at"].endswith("Z")
    assert body == {
        "id": body["id"],
        "name": "HDMI cable",
        "quantity": 1,
        "home_location_id": home,
        "own_item_of": None,
        "path": [{"id": home, "name": "Home", "type": "site"}],
        "status": "in_place",
        "category": None,
        "tags": [],
        "notes": None,
        "brand": None,
        "model": None,
        "serial_number": None,
        "purchase_date": None,
        "price_cents": None,
        "order_link": None,
        "warranty_ends": None,
        "return_ends": None,
        "lent_to": None,
        "lent_at": None,
        "retired_at": None,
        "photo_url": None,
        "created_at": body["created_at"],
        "deleted_at": None,
        "history_entry_id": body["history_entry_id"],
    }


def test_a_location_s_items_are_listed_a_page_at_a_time(signed_in: TestClient) -> None:
    home = _home(signed_in)
    signed_in.post(ITEMS, json={"name": "HDMI cable", "home_location_id": home})
    response = signed_in.get(ITEMS, params={"location_id": home, "everything_inside": True})
    assert response.status_code == 200
    page = response.json()
    assert [item["name"] for item in page["items"]] == ["HDMI cable"]
    assert page["next_cursor"] is None


def test_one_item_is_read_by_its_identifier(signed_in: TestClient) -> None:
    created = signed_in.post(ITEMS, json={"name": "HDMI cable"}).json()
    response = signed_in.get(f"{ITEMS}/{created['id']}")
    assert response.status_code == 200
    assert response.json()["path"] == []


def test_an_unknown_item_is_not_found(signed_in: TestClient) -> None:
    response = signed_in.get(f"{ITEMS}/made-up")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "item_not_found"


def test_a_bad_cursor_is_refused(signed_in: TestClient) -> None:
    response = signed_in.get(ITEMS, params={"location_id": _home(signed_in), "cursor": "nope"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_cursor"


def test_a_blank_name_is_refused_in_the_error_shape(signed_in: TestClient) -> None:
    response = signed_in.post(ITEMS, json={"name": "  "})
    assert response.status_code == 422
    assert list(response.json()["error"]["details"]["fields"]) == ["name"]


def test_changing_the_quantity_answers_with_the_item_and_its_history_entry(
    signed_in: TestClient,
) -> None:
    created = signed_in.post(ITEMS, json={"name": "HDMI cable"}).json()
    response = signed_in.patch(f"{ITEMS}/{created['id']}", json={"quantity": 3})
    assert response.status_code == 200
    body = response.json()
    assert body["quantity"] == 3
    assert body["history_entry_id"] not in ("", created["history_entry_id"])


def test_a_negative_quantity_is_refused(signed_in: TestClient) -> None:
    created = signed_in.post(ITEMS, json={"name": "HDMI cable"}).json()
    response = signed_in.patch(f"{ITEMS}/{created['id']}", json={"quantity": -1})
    assert response.status_code == 422
    assert list(response.json()["error"]["details"]["fields"]) == ["quantity"]


def test_changing_an_unknown_item_is_not_found(signed_in: TestClient) -> None:
    response = signed_in.patch(f"{ITEMS}/made-up", json={"quantity": 2})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "item_not_found"


def test_several_items_are_added_at_once(signed_in: TestClient) -> None:
    home = _home(signed_in)
    names = ["Ethernet cable", "Patch cable", "Cable ties"]
    response = signed_in.post(
        f"{ITEMS}/add-several", json={"names": names, "home_location_id": home}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["history_entry_id"]
    assert [item["name"] for item in body["items"]] == names


def test_adding_several_to_an_unknown_location_is_refused(signed_in: TestClient) -> None:
    response = signed_in.post(
        f"{ITEMS}/add-several", json={"names": ["Drill"], "home_location_id": "nowhere"}
    )
    assert response.status_code == 404


def test_a_photo_adds_a_nameless_item_listed_in_the_inbox(signed_in: TestClient) -> None:
    home = _home(signed_in)
    files = {"photo": ("IMG_0001.jpg", photo(), "image/jpeg")}
    response = signed_in.post(f"{ITEMS}/add-by-photo", files=files, data={"home_location_id": home})
    assert response.status_code == 201
    body = response.json()
    assert (body["name"], body["home_location_id"]) == (None, home)
    assert body["photo_url"].startswith("/api/attachments/")
    inbox = signed_in.get(f"{ITEMS}/inbox").json()
    assert [item["id"] for item in inbox["items"]] == [body["id"]]
    assert signed_in.get(f"{ITEMS}/inbox/count").json() == {"count": 1}


def test_a_file_that_is_not_a_photo_is_refused(signed_in: TestClient) -> None:
    files = {"photo": ("notes.txt", b"shopping list", "text/plain")}
    response = signed_in.post(f"{ITEMS}/add-by-photo", files=files)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unsupported_photo"


def test_a_photo_for_an_unknown_location_leaves_no_file_behind(
    signed_in: TestClient, settings: Settings
) -> None:
    files = {"photo": ("IMG_0001.jpg", photo(), "image/jpeg")}
    response = signed_in.post(
        f"{ITEMS}/add-by-photo", files=files, data={"home_location_id": "nowhere"}
    )
    assert response.status_code == 404
    assert list(settings.attachments_directory.iterdir()) == []


def test_naming_an_item_answers_with_it(signed_in: TestClient) -> None:
    item = signed_in.post(ITEMS, json={"name": "Multimiter"}).json()
    response = signed_in.patch(f"{ITEMS}/{item['id']}", json={"name": "Multimeter"})
    assert response.status_code == 200
    assert (response.json()["name"], response.json()["quantity"]) == ("Multimeter", 1)


def test_clearing_a_name_is_refused(signed_in: TestClient) -> None:
    item = signed_in.post(ITEMS, json={"name": "Drill"}).json()
    response = signed_in.patch(f"{ITEMS}/{item['id']}", json={"name": None})
    assert response.status_code == 422
