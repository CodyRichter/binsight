"""Print the API's OpenAPI description, which the frontend's types are generated from."""

import json
import sys
from pathlib import Path

from app.core.settings import Settings
from app.main import build_app

# The description depends only on the routes; nothing is started, so no setting is read.
PLACEHOLDER_SETTINGS = Settings(
    app_address="https://binsight.example.com",
    data_directory=Path("unused"),
    frontend_directory=Path("unused"),
)


def main() -> None:
    contract = build_app(PLACEHOLDER_SETTINGS).openapi()
    sys.stdout.write(json.dumps(contract, indent=2) + "\n")


if __name__ == "__main__":
    main()
