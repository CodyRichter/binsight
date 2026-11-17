from fastapi.testclient import TestClient

from tests.mcp.conftest import mcp_request


def _assert_refused(client: TestClient, secret: str | None) -> None:
    response = mcp_request(client, secret, "tools/list")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["error"]["code"] == "invalid_mcp_credential"


def test_a_request_without_a_bearer_token_is_refused(client: TestClient) -> None:
    _assert_refused(client, None)


def test_a_wrong_bearer_token_is_refused(signed_in: TestClient, mcp_secret: str) -> None:
    _assert_refused(signed_in, f"{mcp_secret}-wrong")


def test_a_session_cookie_alone_is_refused(signed_in: TestClient) -> None:
    assert signed_in.get("/api/locations").status_code == 200
    _assert_refused(signed_in, None)


def test_a_current_credential_is_answered_at_mcp_itself(
    signed_in: TestClient, mcp_secret: str
) -> None:
    response = mcp_request(signed_in, mcp_secret, "tools/list")
    assert response.status_code == 200
    assert response.json()["result"]["tools"]


def test_a_revoked_credential_is_refused_and_the_owner_stays_signed_in(
    signed_in: TestClient, mcp_secret: str
) -> None:
    credentials = signed_in.get("/api/auth/mcp-credentials").json()["items"]
    signed_in.post(f"/api/auth/mcp-credentials/{credentials[0]['id']}/revoke")
    _assert_refused(signed_in, mcp_secret)
    assert signed_in.get("/api/locations").status_code == 200
