import json
from typing import Any, cast

import httpx2
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import open_write_session
from tests.builders import AcceptanceHome, acceptance_home

MCP_ACCEPT = "application/json, text/event-stream"


def mcp_request(
    client: TestClient, secret: str | None, method: str, params: dict[str, Any] | None = None
) -> httpx2.Response:
    """Send one JSON-RPC message to /mcp the way a client does, and give back the raw answer."""
    headers = {"Accept": MCP_ACCEPT}
    if secret is not None:
        headers["Authorization"] = f"Bearer {secret}"
    message = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}
    return client.post("/mcp", headers=headers, json=message, follow_redirects=False)


class Claude:
    """An MCP client holding one credential, calling tools through the real /mcp address."""

    def __init__(self, client: TestClient, secret: str) -> None:
        self.client = client
        self.secret = secret

    def tool_names(self) -> set[str]:
        tools = mcp_request(self.client, self.secret, "tools/list").json()["result"]["tools"]
        return {tool["name"] for tool in tools}

    def call(self, tool: str, /, **arguments: object) -> dict[str, Any]:
        """A tool's structured result; fails the test if the tool refused."""
        result = self._call(tool, arguments)
        assert not result["isError"], result["content"][0]["text"]
        structured: dict[str, Any] = result["structuredContent"]
        return structured

    def refusal(self, tool: str, /, **arguments: object) -> dict[str, Any]:
        """The API-shaped error a tool refused with; fails the test if it did not refuse."""
        result = self._call(tool, arguments)
        assert result["isError"]
        error: dict[str, Any] = json.loads(result["content"][0]["text"])["error"]
        return error

    def _call(self, tool: str, arguments: dict[str, object]) -> dict[str, Any]:
        params = {"name": tool, "arguments": arguments}
        response = mcp_request(self.client, self.secret, "tools/call", params)
        assert response.status_code == 200
        result: dict[str, Any] = response.json()["result"]
        return result


@pytest.fixture
def mcp_secret(signed_in: TestClient) -> str:
    response = signed_in.post("/api/auth/mcp-credentials", json={"name": "Claude Code"})
    secret: str = response.json()["secret"]
    return secret


@pytest.fixture
def claude(signed_in: TestClient, mcp_secret: str) -> Claude:
    return Claude(signed_in, mcp_secret)


@pytest.fixture
def home(signed_in: TestClient) -> AcceptanceHome:
    app = cast(FastAPI, signed_in.app)
    with open_write_session(app.state.engine) as session:
        return acceptance_home(session)
