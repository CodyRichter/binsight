from fastapi.testclient import TestClient

from tests.mcp.conftest import Claude


def test_claude_backs_up_and_sees_it_listed(claude: Claude, signed_in: TestClient) -> None:
    taken = claude.call("back_up_now")
    listed = claude.call("list_backups")["backups"]
    assert taken["name"] == listed[0]["name"]
    assert taken["size"] > 0
    assert listed == signed_in.get("/api/backups").json()["backups"]
