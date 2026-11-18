from typing import Any

import httpx2
from fastapi.testclient import TestClient

from tests.photos import PDF, photo


def _item(signed_in: TestClient, name: str = "Drill") -> str:
    item_id: str = signed_in.post("/api/items", json={"name": name}).json()["id"]
    return item_id


def _attach_pdf(
    signed_in: TestClient, item_id: str, filename: str = "Receipt.pdf"
) -> httpx2.Response:
    files = {"file": (filename, PDF, "application/pdf")}
    return signed_in.post(f"/api/items/{item_id}/files", files=files)


def _attachments(signed_in: TestClient, item_id: str) -> list[dict[str, Any]]:
    listed: list[dict[str, Any]] = signed_in.get(f"/api/items/{item_id}/attachments").json()[
        "items"
    ]
    return listed


def _undo(signed_in: TestClient, entry_id: str) -> int:
    return signed_in.post(f"/api/history/{entry_id}/undo").status_code


def test_a_file_is_attached_listed_and_served_with_its_name(signed_in: TestClient) -> None:
    drill = _item(signed_in)
    response = _attach_pdf(signed_in, drill)
    assert response.status_code == 201
    attached = response.json()
    assert (attached["kind"], attached["filename"], attached["size"]) == (
        "file",
        "Receipt.pdf",
        len(PDF),
    )
    served = signed_in.get(attached["file_url"])
    assert served.headers["content-type"] == "application/pdf"
    assert served.headers["content-disposition"] == 'inline; filename="Receipt.pdf"'
    assert served.content == PDF
    assert [each["id"] for each in _attachments(signed_in, drill)] == [attached["id"]]


def test_undoing_an_attached_file_removes_it_and_its_file(signed_in: TestClient) -> None:
    drill = _item(signed_in)
    attached = _attach_pdf(signed_in, drill).json()
    assert _undo(signed_in, attached["history_entry_id"]) == 200
    assert _attachments(signed_in, drill) == []
    assert signed_in.get(attached["file_url"]).status_code == 404


def test_a_web_link_is_attached_with_its_name_and_has_no_file(signed_in: TestClient) -> None:
    drill = _item(signed_in)
    link = {"url": "https://example.com/manual", "name": "Manual"}
    attached = signed_in.post(f"/api/items/{drill}/web-links", json=link).json()
    assert (attached["kind"], attached["url"], attached["filename"]) == (
        "link",
        "https://example.com/manual",
        "Manual",
    )
    assert attached["file_url"] is None
    assert signed_in.get(f"/api/attachments/{attached['id']}/file").status_code == 404


def test_a_web_link_must_be_a_web_address(signed_in: TestClient) -> None:
    drill = _item(signed_in)
    response = signed_in.post(f"/api/items/{drill}/web-links", json={"url": "ftp://example"})
    assert response.status_code == 422


def test_photos_come_first_and_the_first_photo_stays_the_picture(signed_in: TestClient) -> None:
    drill = _item(signed_in)
    _attach_pdf(signed_in, drill)
    first = signed_in.post(
        f"/api/items/{drill}/photos", files={"photo": ("a.jpg", photo(), "image/jpeg")}
    ).json()
    signed_in.post(f"/api/items/{drill}/photos", files={"photo": ("b.jpg", photo(), "image/jpeg")})
    kinds = [each["kind"] for each in _attachments(signed_in, drill)]
    assert kinds == ["photo", "photo", "file"]
    assert signed_in.get(f"/api/items/{drill}").json()["photo_url"] == first["file_url"]


def test_removing_an_attachment_keeps_its_file_so_undo_brings_it_back(
    signed_in: TestClient,
) -> None:
    drill = _item(signed_in)
    attached = _attach_pdf(signed_in, drill).json()
    removed = signed_in.delete(f"/api/items/{drill}/attachments/{attached['id']}")
    assert removed.status_code == 200
    assert _attachments(signed_in, drill) == []
    assert _undo(signed_in, removed.json()["history_entry_id"]) == 200
    assert [each["id"] for each in _attachments(signed_in, drill)] == [attached["id"]]
    assert signed_in.get(attached["file_url"]).content == PDF


def test_an_unnamed_item_keeps_its_only_photo(signed_in: TestClient) -> None:
    files = {"photo": ("shelf.jpg", photo(), "image/jpeg")}
    item = signed_in.post("/api/items/add-by-photo", files=files).json()
    [only] = _attachments(signed_in, item["id"])
    response = signed_in.delete(f"/api/items/{item['id']}/attachments/{only['id']}")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "photo_names_item"


def test_an_attachment_belongs_to_its_own_item(signed_in: TestClient) -> None:
    drill, saw = _item(signed_in), _item(signed_in, "Saw")
    attached = _attach_pdf(signed_in, drill).json()
    response = signed_in.delete(f"/api/items/{saw}/attachments/{attached['id']}")
    assert response.json()["error"]["code"] == "attachment_not_found"


def test_a_deleted_item_takes_no_attachments(signed_in: TestClient) -> None:
    drill = _item(signed_in)
    signed_in.delete(f"/api/items/{drill}")
    assert _attach_pdf(signed_in, drill).json()["error"]["code"] == "item_deleted"


def test_a_file_that_is_not_a_pdf_or_image_is_refused(signed_in: TestClient) -> None:
    drill = _item(signed_in)
    files = {"file": ("notes.pdf", b"just text", "application/pdf")}
    response = signed_in.post(f"/api/items/{drill}/files", files=files)
    assert response.json()["error"]["code"] == "unsupported_file"


def test_attaching_shows_in_the_item_s_history(signed_in: TestClient) -> None:
    drill = _item(signed_in)
    _attach_pdf(signed_in, drill)
    history = signed_in.get("/api/history", params={"item_id": drill}).json()["items"]
    assert [entry["action"] for entry in history] == ["item.file_attached", "item.created"]
