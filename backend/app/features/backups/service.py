import asyncio
import os
import re
import shutil
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.core import clock
from app.core.database import copy_database
from app.core.settings import Settings
from app.features.backups.schemas import Backup, BackupList

KEPT = 14
DUE_AFTER = timedelta(hours=24)
CHECK_EVERY_SECONDS = 60 * 60
_STAMP = "%Y%m%dT%H%M%SZ"
_FINISHED_NAME = re.compile(r"\d{8}T\d{6}Z")
_PARTIAL = ".partial"
_one_at_a_time = threading.Lock()


def _described(folder: Path) -> Backup:
    taken_at = datetime.strptime(folder.name, _STAMP).replace(tzinfo=UTC)
    size = sum(file.stat().st_size for file in folder.rglob("*") if file.is_file())
    return Backup(name=folder.name, taken_at=taken_at, size=size)


def _finished_folders(settings: Settings) -> list[Path]:
    if not settings.backups_directory.is_dir():
        return []
    folders = [
        folder
        for folder in settings.backups_directory.iterdir()
        if folder.is_dir() and _FINISHED_NAME.fullmatch(folder.name)
    ]
    return sorted(folders, key=lambda folder: folder.name, reverse=True)


def list_backups(settings: Settings) -> BackupList:
    """The backups kept in the data directory, newest first."""
    return BackupList(backups=[_described(folder) for folder in _finished_folders(settings)])


def _link_attachments(settings: Settings, folder: Path) -> None:
    if not settings.attachments_directory.is_dir():
        return
    for file in settings.attachments_directory.rglob("*"):
        if file.is_file():
            link = folder / file.relative_to(settings.data_directory)
            link.parent.mkdir(parents=True, exist_ok=True)
            # Stored files never change once written, so a link is as good as a copy and costs
            # no space.
            os.link(file, link)


def _prune(settings: Settings) -> None:
    for folder in _finished_folders(settings)[KEPT:]:
        shutil.rmtree(folder)
    for folder in settings.backups_directory.glob(f"*{_PARTIAL}"):
        shutil.rmtree(folder)


def take_backup(settings: Settings, now: datetime) -> Backup:
    """Back up the database and every stored file into a new folder, keeping the newest 14."""
    with _one_at_a_time:
        finished = settings.backups_directory / now.strftime(_STAMP)
        partial = finished.with_name(finished.name + _PARTIAL)
        partial.mkdir(parents=True)
        # The database goes first: every file it names was written before it, so the links
        # taken after it include them all.
        copy_database(settings.database_path, partial / settings.database_path.name)
        _link_attachments(settings, partial)
        # A second backup in the same second replaces the first, so it holds the later changes.
        if finished.exists():
            shutil.rmtree(finished)
        partial.rename(finished)
        _prune(settings)
        return _described(finished)


def backup_is_due(backups: BackupList, now: datetime) -> bool:
    """Whether a day has passed since the newest backup, or there is none."""
    return not backups.backups or now - backups.backups[0].taken_at >= DUE_AFTER


def take_backup_if_due(settings: Settings, now: datetime) -> Backup | None:
    """Take the day's backup unless one was taken in the last 24 hours."""
    if not backup_is_due(list_backups(settings), now):
        return None
    return take_backup(settings, now)


async def run_schedule(settings: Settings) -> None:
    """Check every hour, for as long as the app runs, whether the day's backup is due."""
    while True:
        await asyncio.sleep(CHECK_EVERY_SECONDS)
        await asyncio.to_thread(take_backup_if_due, settings, clock.now())
