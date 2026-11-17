import base64
import json
from datetime import datetime
from typing import Annotated

from fastapi import Query
from pydantic import BaseModel

from app.core.errors import AppError

Limit = Annotated[int, Query(ge=1, le=200)]
DEFAULT_LIMIT = 50


class Page[T](BaseModel):
    items: list[T]
    next_cursor: str | None


def _invalid_cursor() -> AppError:
    return AppError(
        400, "invalid_cursor", "That page marker is not valid. Start from the first page."
    )


def encode_cursor(at: datetime, identifier: str) -> str:
    """Mark where a page ended, so the next page starts after it."""
    position = json.dumps([at.isoformat(), identifier])
    return base64.urlsafe_b64encode(position.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, str]:
    """Read back where the previous page ended, refusing a cursor this app did not make."""
    try:
        at, identifier = json.loads(base64.urlsafe_b64decode(cursor))
        moment = datetime.fromisoformat(at)
    except (ValueError, TypeError) as error:
        raise _invalid_cursor() from error
    if moment.tzinfo is None or not isinstance(identifier, str):
        raise _invalid_cursor()
    return moment, identifier
