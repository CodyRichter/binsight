from collections.abc import Callable
from dataclasses import replace
from http.cookies import SimpleCookie

from fastapi.testclient import TestClient
from httpx2 import Response

from app.core.settings import Settings
from app.main import build_app
from app.models import Role
from tests.conftest import FIRST_ADMIN

STATUS = "/api/auth/status"
ACCOUNTS = "/api/auth/accounts"


def _set_cookie(response_headers: str) -> SimpleCookie:
    cookie = SimpleCookie()
    cookie.load(response_headers)
    return cookie


def _code(response: Response) -> tuple[int, str]:
    return response.status_code, response.json()["error"]["code"]


def test_a_new_install_needs_its_first_admin(client: TestClient) -> None:
    assert client.get(STATUS).json() == {"setup_needed": True, "account": None}


def test_creating_the_first_admin_signs_this_device_in(client: TestClient) -> None:
    response = client.post("/api/auth/first-admin", json=FIRST_ADMIN)
    assert response.status_code == 201
    account = response.json()["account"]
    assert (response.json()["setup_needed"], account["username"], account["role"]) == (
        False,
        "sam",
        "admin",
    )
    assert client.get(STATUS).json()["account"] == account


def test_the_cookie_is_kept_from_scripts_and_other_sites(client: TestClient) -> None:
    response = client.post("/api/auth/first-admin", json=FIRST_ADMIN)
    cookie = _set_cookie(response.headers["set-cookie"])["binsight_session"]
    assert cookie["httponly"]
    assert cookie["samesite"] == "lax"
    assert cookie["path"] == "/"
    assert cookie["max-age"] == str(400 * 24 * 60 * 60)
    assert not cookie["secure"]


def test_the_cookie_is_secure_when_the_app_address_is_https(settings: Settings) -> None:
    https_settings = replace(settings, app_address="https://binsight.example.com")
    with TestClient(build_app(https_settings)) as https_client:
        response = https_client.post("/api/auth/first-admin", json=FIRST_ADMIN)
    assert _set_cookie(response.headers["set-cookie"])["binsight_session"]["secure"]


def test_a_second_first_admin_is_refused(signed_in: TestClient) -> None:
    response = signed_in.post("/api/auth/first-admin", json={**FIRST_ADMIN, "username": "alex"})
    assert _code(response) == (409, "accounts_exist")


def test_a_short_password_is_refused_in_the_error_shape(client: TestClient) -> None:
    response = client.post("/api/auth/first-admin", json={"username": "sam", "password": "short"})
    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "validation_failed",
            "message": "Use at least 8 characters.",
            "details": {"fields": {"password": "Use at least 8 characters."}},
        }
    }


def test_a_username_with_spaces_inside_is_refused(client: TestClient) -> None:
    response = client.post("/api/auth/first-admin", json={**FIRST_ADMIN, "username": "sam smith"})
    assert response.status_code == 422
    assert list(response.json()["error"]["details"]["fields"]) == ["username"]


def test_signing_in_needs_the_right_username_and_password(signed_in: TestClient) -> None:
    signed_in.cookies.clear()
    wrong = signed_in.post("/api/auth/sign-in", json={**FIRST_ADMIN, "password": "wrong horse"})
    assert _code(wrong) == (401, "wrong_sign_in")
    right = signed_in.post("/api/auth/sign-in", json={**FIRST_ADMIN, "username": "SAM"})
    assert right.status_code == 200
    assert signed_in.get(STATUS).json()["account"]["username"] == "sam"


def test_signing_out_ends_the_session_and_clears_the_cookie(signed_in: TestClient) -> None:
    secret = signed_in.cookies["binsight_session"]
    response = signed_in.post("/api/auth/sign-out")
    assert response.status_code == 204
    assert 'binsight_session=""' in response.headers["set-cookie"]
    signed_in.cookies.set("binsight_session", secret)
    assert signed_in.get(STATUS).json()["account"] is None


def test_signing_out_with_no_session_succeeds(client: TestClient) -> None:
    assert client.post("/api/auth/sign-out").status_code == 204


def test_an_admin_adds_an_account_who_can_then_sign_in(signed_in: TestClient) -> None:
    new = {"username": "Alex", "password": "alex horse", "role": "editor"}
    created = signed_in.post(ACCOUNTS, json=new)
    assert created.status_code == 201
    assert (created.json()["username"], created.json()["role"]) == ("alex", "editor")
    assert [each["username"] for each in signed_in.get(ACCOUNTS).json()["items"]] == [
        "sam",
        "alex",
    ]
    other = TestClient(signed_in.app)
    assert other.post("/api/auth/sign-in", json=new).status_code == 200


def test_the_last_admin_is_kept(signed_in: TestClient) -> None:
    sam = signed_in.get(ACCOUNTS).json()["items"][0]["id"]
    assert _code(signed_in.delete(f"{ACCOUNTS}/{sam}")) == (409, "last_admin")
    assert _code(signed_in.patch(f"{ACCOUNTS}/{sam}", json={"role": "viewer"})) == (
        409,
        "last_admin",
    )


def test_an_unknown_account_is_not_found(signed_in: TestClient) -> None:
    assert _code(signed_in.delete(f"{ACCOUNTS}/made-up")) == (404, "account_not_found")


def test_anyone_signed_in_changes_their_own_password(
    sign_in_as: Callable[[Role], TestClient],
) -> None:
    viewer = sign_in_as(Role.viewer)
    change = {"current_password": "correct horse", "new_password": "another horse"}
    assert viewer.post("/api/auth/password", json=change).status_code == 204
    wrong = {"current_password": "correct horse", "new_password": "third horse"}
    assert _code(viewer.post("/api/auth/password", json=wrong)) == (401, "wrong_password")


CREDENTIALS = "/api/auth/mcp-credentials"


def test_creating_an_mcp_credential_answers_with_its_secret_once(signed_in: TestClient) -> None:
    response = signed_in.post(CREDENTIALS, json={"name": "  Claude Desktop  "})
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Claude Desktop"
    assert created["secret"]
    assert created["created_at"].endswith("Z")
    listed = signed_in.get(CREDENTIALS).json()
    assert listed == {
        "items": [{key: created[key] for key in ("id", "name", "created_at")}],
        "next_cursor": None,
    }


def test_an_mcp_credential_needs_a_name(signed_in: TestClient) -> None:
    response = signed_in.post(CREDENTIALS, json={"name": " "})
    assert response.status_code == 422
    assert list(response.json()["error"]["details"]["fields"]) == ["name"]


def test_revoking_an_mcp_credential_removes_it_from_the_list(signed_in: TestClient) -> None:
    created = signed_in.post(CREDENTIALS, json={"name": "Claude Code"}).json()
    response = signed_in.post(f"{CREDENTIALS}/{created['id']}/revoke")
    assert response.status_code == 204
    assert signed_in.get(CREDENTIALS).json()["items"] == []


def test_revoking_an_unknown_mcp_credential_is_not_found(signed_in: TestClient) -> None:
    response = signed_in.post(f"{CREDENTIALS}/made-up/revoke")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "mcp_credential_not_found"
