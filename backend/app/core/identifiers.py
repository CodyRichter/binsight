import secrets


def new_identifier() -> str:
    """Make the random, opaque identifier a new record is known by."""
    return secrets.token_urlsafe(16)
