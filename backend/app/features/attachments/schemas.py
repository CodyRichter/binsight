from dataclasses import dataclass


@dataclass(frozen=True)
class StoredPhoto:
    """A photo already written to the data directory, waiting for its record."""

    id: str
    path: str
    filename: str | None
