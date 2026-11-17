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
