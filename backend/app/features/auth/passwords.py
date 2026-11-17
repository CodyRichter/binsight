import hashlib
import hmac
import secrets
from base64 import b64decode, b64encode

# scrypt's cost is the only brake on guessing; there is no lockout (SECURITY.md).
COST = 2**17
BLOCK_SIZE = 8
PARALLELISM = 1
KEY_LENGTH = 32


def _derive(password: str, salt: bytes, cost: int, block_size: int, parallelism: int) -> bytes:
    return hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=cost,
        r=block_size,
        p=parallelism,
        maxmem=256 * cost * block_size,
        dklen=KEY_LENGTH,
    )


def hash_password(password: str) -> str:
    """Hash a password with its own salt, keeping the cost so it can be raised later."""
    salt = secrets.token_bytes(16)
    key = _derive(password, salt, COST, BLOCK_SIZE, PARALLELISM)
    parts = ["scrypt", str(COST), str(BLOCK_SIZE), str(PARALLELISM)]
    return "$".join([*parts, b64encode(salt).decode(), b64encode(key).decode()])


def password_matches(password: str, stored: str) -> bool:
    """Whether a password is the one a stored hash was made from."""
    _scheme, cost, block_size, parallelism, salt, key = stored.split("$")
    derived = _derive(password, b64decode(salt), int(cost), int(block_size), int(parallelism))
    return hmac.compare_digest(derived, b64decode(key))
