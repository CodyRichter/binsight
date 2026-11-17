from alembic import context
from sqlalchemy import Connection

from app.core.database import create_database_engine
from app.core.settings import load_settings
from app.models import Model


def run_migrations(connection: Connection) -> None:
    # SQLite cannot alter columns, so every change rebuilds the table in batch mode.
    context.configure(connection=connection, target_metadata=Model.metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


given_connection = context.config.attributes.get("connection")
if isinstance(given_connection, Connection):
    run_migrations(given_connection)
else:
    with create_database_engine(load_settings().database_path).connect() as connection:
        run_migrations(connection)
