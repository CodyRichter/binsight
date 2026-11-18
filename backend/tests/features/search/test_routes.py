from fastapi.testclient import TestClient

from tests.photos import photo


def test_search_answers_with_ranked_results(signed_in: TestClient) -> None:
    signed_in.post("/api/items", json={"name": "HDMI cable"})
    response = signed_in.get("/api/search", params={"query": "hdmi"})
    assert response.status_code == 200
    body = response.json()
    assert (body["count"], body["next_cursor"]) == (1, None)
    assert body["results"][0]["kind"] == "item"
    assert body["results"][0]["item"]["name"] == "HDMI cable"
    assert body["results"][0]["marks"] == [{"start": 0, "end": 4}]


def test_an_item_added_by_photo_and_not_named_is_not_found(signed_in: TestClient) -> None:
    files = {"photo": ("hdmi.jpg", photo(), "image/jpeg")}
    signed_in.post("/api/items/add-by-photo", files=files)
    assert signed_in.get("/api/search", params={"query": "hdmi"}).json()["count"] == 0


def test_a_query_longer_than_two_hundred_characters_is_refused(signed_in: TestClient) -> None:
    response = signed_in.get("/api/search", params={"query": "x" * 201})
    assert response.status_code == 422


def test_a_made_up_cursor_is_refused(signed_in: TestClient) -> None:
    response = signed_in.get("/api/search", params={"query": "hdmi", "cursor": "nope"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_cursor"
