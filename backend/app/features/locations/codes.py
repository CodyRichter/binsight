import re
import secrets
from pathlib import Path

from sqlalchemy.orm import Session

from app import models

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
TYPED_CODE = re.compile(r"[A-Z0-9]{3}-?[A-Z0-9]{3}")
BLOCKED_WORDS = tuple(Path(__file__).with_name("blocked_words.txt").read_text().upper().split())
# A digit standing in for a letter still reads as the word, so each code is checked as letters too.
DIGITS_AS_LETTERS = (
    str.maketrans("0134578", "OIEASTB"),
    str.maketrans("0134578", "OLEASTB"),
)


def is_blocked(code: str) -> bool:
    """Whether a code spells something that must never be printed on a label."""
    joined = code.replace("-", "")
    readings = {joined, *(joined.translate(letters) for letters in DIGITS_AS_LETTERS)}
    return any(word in reading for reading in readings for word in BLOCKED_WORDS)


def location_code(text: str) -> str:
    """The location code typed text names, ignoring case and the hyphen, else the text."""
    typed = text.strip().upper()
    if TYPED_CODE.fullmatch(typed) is None:
        return text
    joined = typed.replace("-", "")
    return f"{joined[:3]}-{joined[3:]}"


def new_location_code(session: Session) -> str:
    """A random code no location has, safe to print, that the new location is known by forever."""
    while True:
        joined = "".join(secrets.choice(ALPHABET) for _ in range(6))
        code = f"{joined[:3]}-{joined[3:]}"
        if not is_blocked(code) and session.get(models.Location, code) is None:
            return code
