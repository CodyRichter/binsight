from fastapi.testclient import TestClient


def _bin_with_item(client: TestClient) -> tuple[str, str]:
    site = client.post("/api/locations", json={"name": "Home", "type": "site"}).json()["id"]
    bin_id = client.post(
        "/api/locations", json={"name": "Cables", "type": "bin", "parent_id": site}
    ).json()["id"]
    item = client.post("/api/items", json={"name": "HDMI cable", "home_location_id": bin_id})
    return bin_id, item.json()["id"]


def test_checking_a_location_through_the_api(signed_in: TestClient) -> None:
    bin_id, item_id = _bin_with_item(signed_in)
    response = signed_in.post(f"/api/locations/{bin_id}/check", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["last_checked_at"].endswith("Z")
    assert body["marked_missing"] == []
    assert body["history_entry_id"]
    item = signed_in.get(f"/api/items/{item_id}").json()
    assert item["last_checked_at"] == body["last_checked_at"]
    tree = signed_in.get("/api/locations").json()["locations"]
    assert next(each for each in tree if each["id"] == bin_id)["last_checked_at"]


def test_checking_with_an_item_missing_through_the_api(signed_in: TestClient) -> None:
    bin_id, item_id = _bin_with_item(signed_in)
    response = signed_in.post(
        f"/api/locations/{bin_id}/check", json={"missing_item_ids": [item_id]}
    )
    assert [item["status"] for item in response.json()["marked_missing"]] == ["missing"]
    again = signed_in.post(f"/api/locations/{bin_id}/check", json={"missing_item_ids": [item_id]})
    assert (again.status_code, again.json()["error"]["code"]) == (409, "already_missing")
