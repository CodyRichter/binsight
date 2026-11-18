import base64
import json
from datetime import datetime
from typing import Annotated

from fastapi import Query
from pydantic import BaseModel, Field

from app.core.errors import AppError

MAX_LIMIT = 200
Limit = Annotated[int, Query(ge=1, le=MAX_LIMIT)]
DEFAULT_LIMIT = 50


class PageLimit(BaseModel):
    """How many records an MCP tool asks for, held to the bounds a list route's `limit` has."""

    limit: int = Field(ge=1, le=MAX_LIMIT)


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


def encode_offset(offset: int) -> str:
    """Mark how many results earlier pages held, for a list that is ranked, not dated."""
    return base64.urlsafe_b64encode(json.dumps(offset).encode()).decode()


def decode_offset(cursor: str) -> int:
    """Read back how many results earlier pages held, refusing a cursor this app did not make."""
    try:
        offset = json.loads(base64.urlsafe_b64decode(cursor))
    except ValueError as error:
        raise _invalid_cursor() from error
    if not isinstance(offset, int) or isinstance(offset, bool) or offset < 0:
        raise _invalid_cursor()
    return offset


def counted_page[T](rows: list[T], start: int, limit: int) -> Page[T]:
    """One page of a list already read in full, for one that is grouped or sorted in Python."""
    end = start + limit
    return Page(items=rows[start:end], next_cursor=encode_offset(end) if end < len(rows) else None)
