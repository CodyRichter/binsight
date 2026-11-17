from datetime import UTC, datetime


def now() -> datetime:
    """The current time in UTC; the one place the app reads the clock."""
    return datetime.now(UTC)
