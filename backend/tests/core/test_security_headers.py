from collections.abc import Mapping

from fastapi.testclient import TestClient


def _has_common_headers(headers: Mapping[str, str]) -> bool:
    return (
        headers["X-Content-Type-Options"] == "nosniff"
        and headers["Referrer-Policy"] == "same-origin"
        and headers["X-Frame-Options"] == "DENY"
    )


def test_api_answers_are_never_cached(client: TestClient) -> None:
    response = client.get("/api/health")
    assert _has_common_headers(response.headers)
    assert response.headers["Cache-Control"] == "no-store"
    assert "Content-Security-Policy" not in response.headers


def test_the_app_page_carries_the_content_policy(client: TestClient) -> None:
    response = client.get("/settings")
    assert _has_common_headers(response.headers)
    policy = response.headers["Content-Security-Policy"]
    assert "script-src 'self'" in policy
    assert "frame-ancestors 'none'" in policy


def test_a_built_file_carries_no_content_policy(client: TestClient) -> None:
    response = client.get("/assets/app.js")
    assert _has_common_headers(response.headers)
    assert "Content-Security-Policy" not in response.headers


def test_a_refusal_carries_the_headers_too(client: TestClient) -> None:
    response = client.post("/api/auth/sign-out", headers={"Sec-Fetch-Site": "cross-site"})
    assert _has_common_headers(response.headers)
    assert response.headers["Cache-Control"] == "no-store"
