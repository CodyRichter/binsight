from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel

from app.models import AttachmentKind


@dataclass(frozen=True)
class StoredFile:
    """A photo or file already written to the data directory, waiting for its record."""

    id: str
    path: str
    filename: str | None
    content_type: str
    size: int


@dataclass(frozen=True)
class FileOnDisk:
    """Where an attachment's file is, and what to call it when it is served."""

    path: Path
    content_type: str
    filename: str | None


class Attachment(BaseModel):
    id: str
    kind: AttachmentKind
    filename: str | None
    url: str | None
    content_type: str | None
    size: int | None
    file_url: str | None
    created_at: datetime
