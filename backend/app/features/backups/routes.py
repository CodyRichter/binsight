from fastapi import APIRouter

from app.core import clock
from app.core.settings import AppSettings
from app.features.backups import service
from app.features.backups.schemas import Backup, BackupList

router = APIRouter()


@router.get("/backups", operation_id="list_backups")
def list_backups(settings: AppSettings) -> BackupList:
    return service.list_backups(settings)


@router.post("/backups", operation_id="back_up_now", status_code=201)
def back_up_now(settings: AppSettings) -> Backup:
    return service.take_backup(settings, clock.now())
