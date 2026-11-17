from dataclasses import replace
from http.cookies import SimpleCookie

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core import clock
from app.core.database import open_write_session
from app.core.errors import add_error_handlers
from app.core.settings import Settings
from app.features.auth import service
from app.features.auth.routes import require_sign_in
from app.main import build_app

PASSWORD = {"password": "correct horse"}
STATUS = "/api/auth/status"


def _set_cookie(response_headers: str) -> SimpleCookie:
    cookie = SimpleCookie()
    cookie.load(response_headers)
    return cookie


def test_a_new_install_reports_no_owner(client: TestClient) -> None:
    assert client.get(STATUS).json() == {"owner_exists": False, "signed_in": False}


def test_creating_the_owner_signs_this_device_in(client: TestClient) -> None:
    response = client.post("/api/auth/owner", json=PASSWORD)
    assert response.status_code == 201
    assert response.json() == {"owner_exists": True, "signed_in": True}
    assert client.get(STATUS).json()["signed_in"]


def test_the_cookie_is_kept_from_scripts_and_other_sites(client: TestClient) -> None:
    response = client.post("/api/auth/owner", json=PASSWORD)
    cookie = _set_cookie(response.headers["set-cookie"])["binsight_session"]
    assert cookie["httponly"]
    assert cookie["samesite"] == "lax"
    assert cookie["path"] == "/"
    assert cookie["max-age"] == str(400 * 24 * 60 * 60)
    assert not cookie["secure"]


def test_the_cookie_is_secure_when_the_app_address_is_https(settings: Settings) -> None:
    https_settings = replace(settings, app_address="https://binsight.example.com")
    with TestClient(build_app(https_settings)) as https_client:
        response = https_client.post("/api/auth/owner", json=PASSWORD)
    assert _set_cookie(response.headers["set-cookie"])["binsight_session"]["secure"]


def test_a_second_owner_is_refused(client: TestClient) -> None:
    client.post("/api/auth/owner", json=PASSWORD)
    response = client.post("/api/auth/owner", json={"password": "another one"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "owner_exists"


def test_a_short_password_is_refused_in_the_error_shape(client: TestClient) -> None:
    response = client.post("/api/auth/owner", json={"password": "short"})
    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "validation_failed",
            "message": "Use at least 8 characters.",
            "details": {"fields": {"password": "Use at least 8 characters."}},
        }
    }


def test_signing_in_needs_the_right_password(client: TestClient) -> None:
    client.post("/api/auth/owner", json=PASSWORD)
    client.cookies.clear()
    wrong = client.post("/api/auth/sign-in", json={"password": "wrong horse"})
    assert (wrong.status_code, wrong.json()["error"]["code"]) == (401, "wrong_password")
    assert client.post("/api/auth/sign-in", json=PASSWORD).status_code == 200
    assert client.get(STATUS).json()["signed_in"]


def test_signing_in_before_an_owner_exists_is_refused(client: TestClient) -> None:
    response = client.post("/api/auth/sign-in", json=PASSWORD)
    assert (response.status_code, response.json()["error"]["code"]) == (409, "owner_not_created")


def test_signing_out_ends_the_session_and_clears_the_cookie(client: TestClient) -> None:
    client.post("/api/auth/owner", json=PASSWORD)
    secret = client.cookies["binsight_session"]
    response = client.post("/api/auth/sign-out")
    assert response.status_code == 204
    assert 'binsight_session=""' in response.headers["set-cookie"]
    client.cookies.set("binsight_session", secret)
    assert not client.get(STATUS).json()["signed_in"]


def test_signing_out_with_no_session_succeeds(client: TestClient) -> None:
    assert client.post("/api/auth/sign-out").status_code == 204


def _guarded_client(migrated_engine: Engine) -> TestClient:
    app = FastAPI()
    add_error_handlers(app)
    app.state.engine = migrated_engine

    @app.get("/guarded", dependencies=[Depends(require_sign_in)])
    def guarded() -> dict[str, bool]:
        return {"reached": True}

    return TestClient(app)


def test_a_signed_in_only_route_refuses_a_request_without_a_session(
    migrated_engine: Engine,
) -> None:
    response = _guarded_client(migrated_engine).get("/guarded")
    assert response.status_code == 401
    assert response.json()["error"] == {
        "code": "not_signed_in",
        "message": "Sign in to continue.",
        "details": {},
    }


def test_a_signed_in_only_route_answers_a_current_session(migrated_engine: Engine) -> None:
    with open_write_session(migrated_engine) as session:
        secret = service.create_owner(session, PASSWORD["password"], clock.now())
    guarded = _guarded_client(migrated_engine)
    guarded.cookies.set("binsight_session", secret)
    assert guarded.get("/guarded").json() == {"reached": True}


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
