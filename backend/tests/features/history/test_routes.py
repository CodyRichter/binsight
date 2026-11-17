from fastapi.testclient import TestClient


def test_an_items_history_is_listed(signed_in: TestClient) -> None:
    item = signed_in.post("/api/items", json={"name": "HDMI cable"}).json()
    response = signed_in.get("/api/history", params={"item_id": item["id"]})
    assert response.status_code == 200
    page = response.json()
    assert [(e["id"], e["action"], e["actor"]) for e in page["items"]] == [
        (item["history_entry_id"], "item.created", "app")
    ]
    assert page["next_cursor"] is None


def test_history_needs_an_item(signed_in: TestClient) -> None:
    response = signed_in.get("/api/history")
    assert response.status_code == 422
    assert list(response.json()["error"]["details"]["fields"]) == ["item_id"]


def test_undoing_an_add_answers_with_the_new_entry(signed_in: TestClient) -> None:
    item = signed_in.post("/api/items", json={"name": "Ethernet cable"}).json()
    response = signed_in.post(f"/api/history/{item['history_entry_id']}/undo")
    assert response.status_code == 200
    body = response.json()
    assert body["undone_entry_id"] == item["history_entry_id"]
    assert body["history_entry_id"] != item["history_entry_id"]
    assert signed_in.get(f"/api/items/{item['id']}").status_code == 404


def test_undoing_twice_is_refused(signed_in: TestClient) -> None:
    item = signed_in.post("/api/items", json={"name": "Ethernet cable"}).json()
    signed_in.post(f"/api/history/{item['history_entry_id']}/undo")
    response = signed_in.post(f"/api/history/{item['history_entry_id']}/undo")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "already_undone"


def test_undoing_an_unknown_change_is_not_found(signed_in: TestClient) -> None:
    response = signed_in.post("/api/history/made-up/undo")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "history_entry_not_found"
