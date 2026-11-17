import os
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

from fastapi import Depends, Request

BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]


class MissingSettingError(Exception):
    pass


@dataclass(frozen=True)
class Settings:
    app_address: str
    data_directory: Path
    frontend_directory: Path

    @property
    def database_path(self) -> Path:
        return self.data_directory / "binsight.db"

    @property
    def backups_directory(self) -> Path:
        return self.data_directory / "backups"

    @property
    def is_https(self) -> bool:
        return self.app_address.startswith("https://")


def load_settings() -> Settings:
    """Read the install's settings from the environment; the app address has no default."""
    app_address = os.environ.get("BINSIGHT_APP_ADDRESS", "").strip()
    if not app_address:
        raise MissingSettingError(
            "BINSIGHT_APP_ADDRESS must be set to the address the app is reached at, "
            "such as https://binsight.example.com. It is printed on every label."
        )
    return Settings(
        app_address=app_address.rstrip("/"),
        data_directory=Path(os.environ.get("BINSIGHT_DATA_DIRECTORY", "/data")),
        frontend_directory=BACKEND_DIRECTORY.parent / "frontend" / "dist",
    )


def app_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


AppSettings = Annotated[Settings, Depends(app_settings)]
