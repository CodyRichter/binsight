from datetime import datetime

from pydantic import BaseModel


class Backup(BaseModel):
    name: str
    taken_at: datetime
    size: int


class BackupList(BaseModel):
    backups: list[Backup]
