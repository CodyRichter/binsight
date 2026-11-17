from fastapi.testclient import TestClient

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
        "path": [{"id": home, "name": "Home"}],
        "created_at": body["created_at"],
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
