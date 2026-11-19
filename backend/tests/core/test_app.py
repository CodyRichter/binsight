from fastapi.testclient import TestClient


def test_health_reports_ok(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_an_unknown_api_address_gets_the_error_shape(client: TestClient) -> None:
    response = client.post("/api/no-such-thing")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "route_not_found"


def test_a_page_address_is_answered_with_the_frontend(client: TestClient) -> None:
    response = client.get("/l/K7Q-4MZ")
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
