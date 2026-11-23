from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Model

# The one row of settings an admin keeps for the whole install.
INSTALL_SETTINGS_ID = 1


class InstallSettings(Model):
    __tablename__ = "install_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Where Direct Print sends a label's PNG; null until an admin sets it.
    print_address: Mapped[str | None]
