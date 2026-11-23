import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.errors import AppError

PRINT_TIMEOUT_SECONDS = 30
MOST_OF_THE_REPLY = 300


def _reply_text(raw: bytes) -> str:
    """The printer's reply in words: a JSON reply's detail, error or message, else the text."""
    text = raw.decode("utf-8", "replace").strip()
    try:
        reply = json.loads(text)
    except ValueError:
        return text
    if isinstance(reply, dict):
        for key in ("detail", "error", "message"):
            if isinstance(reply.get(key), str):
                return str(reply[key])
    return text


def send_to_printer(print_address: str, png: bytes) -> None:
    """POST the label's PNG to the print address, as the body, and wait for the answer."""
    # PrintAddressText allows only http and https, so no file: or custom scheme gets here.
    headers = {"Content-Type": "image/png"}
    request = Request(print_address, data=png, method="POST", headers=headers)  # noqa: S310
    try:
        with urlopen(request, timeout=PRINT_TIMEOUT_SECONDS):  # noqa: S310
            return
    except HTTPError as error:
        reply = _reply_text(error.read(MOST_OF_THE_REPLY))
        reason = f"it answered {error.code}" + (f": {reply}" if reply else "")
    except (URLError, TimeoutError, OSError) as error:
        reason = f"it could not be reached ({getattr(error, 'reason', error)})"
    raise AppError(
        502,
        "print_failed",
        f"The label was not printed: {reason}. "
        "Check the printer and the print address in settings.",
    )
