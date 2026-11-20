import re
from collections.abc import Callable

from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import build_app
from app.models import Role

# The role each route needs (decision 0022); every route must be named in exactly one.
VIEWER = {
    "change_own_password",
    "get_insurance_list",
    "list_history",
}
EDITOR = {
    "add_item_photo",
    "add_item_by_photo",
    "add_items",
    "make_own_item",
    "attach_file",
    "attach_web_link",
    "change_item_status",
    "change_items_category",
    "change_items_status",
    "create_item",
    "create_location",
    "create_saved_search",
    "delete_item",
    "delete_items",
    "delete_location",
    "delete_saved_search",
    "duplicate_item",
    "lend_item",
    "lend_items",
    "link_items",
    "mark_item_found",
    "mark_item_missing",
    "merge_item",
    "merge_location",
    "move_item",
    "move_items",
    "move_location",
    "remove_item_attachment",
    "remove_location_photo",
    "reorder_location",
    "restore_item",
    "restore_location",
    "return_item",
    "set_location_photo",
    "tag_items",
    "undo_history_entry",
    "unlink_items",
    "update_item",
    "update_location",
    "update_saved_search",
}
ADMIN = {
    "back_up_now",
    "create_account",
    "create_mcp_credential",
    "delete_account",
    "export_everything",
    "import_items",
    "list_accounts",
    "list_backups",
    "list_mcp_credentials",
    "revoke_mcp_credential",
    "update_account",
}
NEEDS = {
    **dict.fromkeys(VIEWER, Role.viewer),
    **dict.fromkeys(EDITOR, Role.editor),
    **dict.fromkeys(ADMIN, Role.admin),
}
BELOW = {Role.editor: Role.viewer, Role.admin: Role.editor}


def _api_operations(settings: Settings) -> list[tuple[str, str, str]]:
    paths = build_app(settings).openapi()["paths"]
    return [
        (method.upper(), path, operation["operationId"])
        for path, operations in paths.items()
        for method, operation in operations.items()
    ]


def _send(client: TestClient, method: str, path: str) -> int:
    return client.request(method, re.sub(r"\{[^}]+\}", "x", path)).status_code


def test_every_route_needing_a_role_is_refused_to_a_visitor(
    settings: Settings, visitor: TestClient
) -> None:
    operations = {operation for _method, _path, operation in _api_operations(settings)}
    assert operations >= NEEDS.keys()
    for method, path, operation in _api_operations(settings):
        if operation in NEEDS:
            assert _send(visitor, method, path) == 401, f"{method} {path} answered a visitor"


def test_every_route_is_refused_to_the_role_below_the_one_it_needs(
    settings: Settings, sign_in_as: Callable[[Role], TestClient]
) -> None:
    clients = {role: sign_in_as(role) for role in BELOW.values()}
    for method, path, operation in _api_operations(settings):
        needed = NEEDS.get(operation)
        if needed in BELOW:
            below = clients[BELOW[needed]]
            assert _send(below, method, path) == 403, f"{method} {path} answered a lower role"


def test_every_write_needs_an_editor_at_least(settings: Settings) -> None:
    public_writes = {"create_first_admin", "sign_in", "sign_out"}
    for method, _path, operation in _api_operations(settings):
        if method != "GET" and operation not in public_writes:
            assert operation in NEEDS, f"{operation} changes something and needs no role"
