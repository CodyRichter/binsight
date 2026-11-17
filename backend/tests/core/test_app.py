import re

from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import build_app


def test_health_reports_ok(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_an_unknown_api_address_gets_the_error_shape(client: TestClient) -> None:
    response = client.post("/api/no-such-thing")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "route_not_found"


def test_a_page_address_is_answered_with_the_frontend(client: TestClient) -> None:
    response = client.get("/l/B-014")
    assert response.status_code == 200
    assert "<title>Binsight</title>" in response.text


def test_a_built_file_is_served_as_itself(client: TestClient) -> None:
    response = client.get("/assets/app.js")
    assert response.text == "console.log('app')"


def test_a_missing_built_file_is_not_answered_with_the_frontend(client: TestClient) -> None:
    response = client.get("/assets/gone.js")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "file_not_found"


def test_the_frontend_page_is_checked_for_a_newer_one_on_each_visit(client: TestClient) -> None:
    response = client.get("/settings")
    assert response.headers["cache-control"] == "no-cache"


def test_a_path_outside_the_frontend_files_gets_the_frontend(client: TestClient) -> None:
    response = client.get("/%2e%2e/data/binsight.db")
    assert "<title>Binsight</title>" in response.text


def test_a_method_the_api_does_not_take_gets_the_error_shape(client: TestClient) -> None:
    response = client.request("OPTIONS", "/api/health")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


# Routes answered without a session. B4's parity test names the same ones as having no MCP tool.
PUBLIC_OPERATIONS = {"get_health", "get_auth_status", "create_owner", "sign_in", "sign_out"}


def _api_operations(settings: Settings) -> list[tuple[str, str, str]]:
    paths = build_app(settings).openapi()["paths"]
    return [
        (method.upper(), path, operation["operationId"])
        for path, operations in paths.items()
        for method, operation in operations.items()
    ]


def test_the_public_routes_are_the_ones_named(settings: Settings) -> None:
    operations = {operation for _method, _path, operation in _api_operations(settings)}
    assert operations >= PUBLIC_OPERATIONS


def test_every_other_api_route_needs_a_session(settings: Settings, client: TestClient) -> None:
    for method, path, operation in _api_operations(settings):
        if operation in PUBLIC_OPERATIONS:
            continue
        response = client.request(method, re.sub(r"\{[^}]+\}", "x", path))
        assert response.status_code == 401, f"{method} {path} answered without a session"
