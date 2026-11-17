from fastapi.testclient import TestClient

LOCATIONS = "/api/locations"


def _create(client: TestClient, name: str, kind: str, parent_id: str | None = None) -> str:
    response = client.post(LOCATIONS, json={"name": name, "type": kind, "parent_id": parent_id})
    assert response.status_code == 201
    location_id: str = response.json()["id"]
    return location_id


def test_creating_a_location_answers_with_it_and_its_history_entry(signed_in: TestClient) -> None:
    response = signed_in.post(LOCATIONS, json={"name": " Home ", "type": "site"})
    assert response.status_code == 201
    body = response.json()
    assert body["history_entry_id"]
    assert body == {
        "id": body["id"],
        "name": "Home",
        "type": "site",
        "parent_id": None,
        "summary": None,
        "label_code": None,
        "path": [{"id": body["id"], "name": "Home"}],
        "direct_item_count": 0,
        "item_count": 0,
        "history_entry_id": body["history_entry_id"],
    }


def test_the_tree_is_listed_whole(signed_in: TestClient) -> None:
    home = _create(signed_in, "Home", "site")
    garage = _create(signed_in, "Garage", "room", home)
    response = signed_in.get(LOCATIONS)
    assert response.status_code == 200
    assert [location["id"] for location in response.json()["locations"]] == [home, garage]


def test_one_location_is_read_by_its_identifier(signed_in: TestClient) -> None:
    home = _create(signed_in, "Home", "site")
    garage = _create(signed_in, "Garage", "room", home)
    response = signed_in.get(f"{LOCATIONS}/{garage}")
    assert response.status_code == 200
    assert [step["name"] for step in response.json()["path"]] == ["Home", "Garage"]


def test_an_unknown_location_is_not_found(signed_in: TestClient) -> None:
    response = signed_in.get(f"{LOCATIONS}/made-up")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "location_not_found"


def test_a_blank_name_is_refused_in_the_error_shape(signed_in: TestClient) -> None:
    response = signed_in.post(LOCATIONS, json={"name": "  ", "type": "site"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_failed"
    assert list(error["details"]["fields"]) == ["name"]


def test_a_room_without_a_parent_is_refused(signed_in: TestClient) -> None:
    response = signed_in.post(LOCATIONS, json={"name": "Garage", "type": "room"})
    assert response.status_code == 422
    assert response.json()["error"]["message"] == (
        "A site has no parent, and every other location has one."
    )


def test_locations_need_sign_in(client: TestClient) -> None:
    response = client.get(LOCATIONS)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_signed_in"
