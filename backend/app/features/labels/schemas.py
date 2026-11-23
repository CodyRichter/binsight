from typing import Annotated

from pydantic import BaseModel, StringConstraints

PrintAddressText = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=500, pattern=r"^https?://\S+$")
]


class LabelImage(BaseModel):
    code: str
    png: bytes


class PrintAddress(BaseModel):
    """Where Direct Print sends a label's PNG; null when no printer is set up."""

    print_address: PrintAddressText | None


class PrintedLabel(BaseModel):
    code: str
