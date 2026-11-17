import pytest
from fastapi.testclient import TestClient

SIGN_OUT = "/api/auth/sign-out"


@pytest.mark.parametrize("fetch_site", ["cross-site", "same-site"])
def test_a_write_from_another_site_is_refused(client: TestClient, fetch_site: str) -> None:
    response = client.post(SIGN_OUT, headers={"Sec-Fetch-Site": fetch_site})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "cross_site_request"


@pytest.mark.parametrize("fetch_site", ["same-origin", "none"])
def test_a_write_from_the_app_itself_passes(client: TestClient, fetch_site: str) -> None:
    assert client.post(SIGN_OUT, headers={"Sec-Fetch-Site": fetch_site}).status_code == 204


def test_without_fetch_metadata_another_origin_is_refused(client: TestClient) -> None:
    response = client.post(SIGN_OUT, headers={"Origin": "https://other.example"})
    assert response.status_code == 403


def test_without_fetch_metadata_the_app_address_passes(client: TestClient) -> None:
    assert client.post(SIGN_OUT, headers={"Origin": "http://binsight.test"}).status_code == 204


def test_a_write_from_a_tool_with_neither_header_passes(client: TestClient) -> None:
    assert client.post(SIGN_OUT).status_code == 204


def test_a_read_from_another_site_is_answered(client: TestClient) -> None:
    response = client.get("/api/auth/status", headers={"Sec-Fetch-Site": "cross-site"})
    assert response.status_code == 200
