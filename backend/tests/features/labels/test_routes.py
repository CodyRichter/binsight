from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from threading import Thread
from typing import ClassVar

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.features.labels.label_image import draw_label

LABELS = "/api/labels"


def _site(client: TestClient) -> str:
    response = client.post("/api/locations", json={"name": "Home", "type": "site"})
    location_id: str = response.json()["id"]
    return location_id


def test_a_visitor_can_see_a_label(visitor: TestClient) -> None:
    response = visitor.get(f"{LABELS}/ZZZ-999/image")
    assert (response.status_code, response.json()["error"]["code"]) == (404, "location_not_found")


def test_an_unknown_code_is_not_found(signed_in: TestClient) -> None:
    response = signed_in.get(f"{LABELS}/ZZZ-999/image")
    assert (response.status_code, response.json()["error"]["code"]) == (404, "location_not_found")


def test_the_image_downloads_as_a_png_holding_the_label_address(signed_in: TestClient) -> None:
    code = _site(signed_in)
    response = signed_in.get(f"{LABELS}/{code.lower().replace('-', '')}/image")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["content-disposition"] == f'attachment; filename="{code}.png"'
    assert Image.open(BytesIO(response.content)).format == "PNG"
    assert response.content == draw_label(code, f"http://binsight.test/l/{code}")


class _Printer(BaseHTTPRequestHandler):
    """A stand-in print server: keeps what it was sent, and answers with its class's status."""

    status = 200
    reply = b"printer is out of labels"
    address = ""
    received: ClassVar[list[tuple[str, bytes]]] = []

    def do_POST(self) -> None:
        body = self.rfile.read(int(self.headers["Content-Length"]))
        self.received.append((self.headers["Content-Type"], body))
        self.send_response(self.status)
        self.end_headers()
        self.wfile.write(self.reply if self.status >= 400 else b"{}")

    def log_message(self, *_args: object) -> None:
        return


@pytest.fixture
def printer() -> Iterator[type[_Printer]]:
    _Printer.status = 200
    _Printer.reply = b"printer is out of labels"
    _Printer.received = []
    server = ThreadingHTTPServer(("127.0.0.1", 0), _Printer)
    Thread(target=server.serve_forever, daemon=True).start()
    _Printer.address = f"http://127.0.0.1:{server.server_port}/print"
    yield _Printer
    server.shutdown()


def test_the_print_address_starts_unset_and_an_admin_can_set_and_clear_it(
    signed_in: TestClient,
) -> None:
    assert signed_in.get(f"{LABELS}/print-address").json() == {"print_address": None}
    address = {"print_address": "http://printer.local/print?size=3x2"}
    assert signed_in.patch(f"{LABELS}/print-address", json=address).json() == address
    assert signed_in.get(f"{LABELS}/print-address").json() == address
    cleared = signed_in.patch(f"{LABELS}/print-address", json={"print_address": None})
    assert cleared.json() == {"print_address": None}


def test_the_print_address_must_be_a_web_address(signed_in: TestClient) -> None:
    response = signed_in.patch(f"{LABELS}/print-address", json={"print_address": "file:///etc/x"})
    assert response.status_code == 422


def test_printing_without_a_print_address_is_refused(signed_in: TestClient) -> None:
    code = _site(signed_in)
    response = signed_in.post(f"{LABELS}/{code}/print")
    assert (response.status_code, response.json()["error"]["code"]) == (
        409,
        "print_address_not_set",
    )


def test_printing_sends_the_label_png_to_the_print_address(
    signed_in: TestClient, printer: type[_Printer]
) -> None:
    code = _site(signed_in)
    signed_in.patch(f"{LABELS}/print-address", json={"print_address": printer.address})
    response = signed_in.post(f"{LABELS}/{code}/print")
    assert (response.status_code, response.json()) == (200, {"code": code})
    assert printer.received == [("image/png", draw_label(code, f"http://binsight.test/l/{code}"))]


def test_a_printer_refusal_is_passed_on(signed_in: TestClient, printer: type[_Printer]) -> None:
    code = _site(signed_in)
    signed_in.patch(f"{LABELS}/print-address", json={"print_address": printer.address})
    printer.status = 500
    response = signed_in.post(f"{LABELS}/{code}/print")
    assert (response.status_code, response.json()["error"]["code"]) == (502, "print_failed")
    assert "printer is out of labels" in response.json()["error"]["message"]


def test_a_json_refusal_is_passed_on_in_words(
    signed_in: TestClient, printer: type[_Printer]
) -> None:
    code = _site(signed_in)
    signed_in.patch(f"{LABELS}/print-address", json={"print_address": printer.address})
    printer.status = 500
    printer.reply = b'{"error": "printer jammed"}'
    message = signed_in.post(f"{LABELS}/{code}/print").json()["error"]["message"]
    assert message.startswith("The label was not printed: it answered 500: printer jammed.")
