from pathlib import Path

from sqlalchemy import event
from sqlalchemy.orm import Session

_WAITING = "files_to_remove"


def _remove_waiting_files(session: Session) -> None:
    for path in session.info.pop(_WAITING, []):
        path.unlink(missing_ok=True)


def _keep_waiting_files(session: Session) -> None:
    session.info.pop(_WAITING, None)


def remove_after_commit(session: Session, path: Path) -> None:
    """Delete a stored file once the session's transaction commits; a rollback keeps it."""
    if not event.contains(session, "after_commit", _remove_waiting_files):
        event.listen(session, "after_commit", _remove_waiting_files)
        event.listen(session, "after_rollback", _keep_waiting_files)
    session.info.setdefault(_WAITING, []).append(path)
