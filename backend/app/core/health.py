from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.core.database import ReadSession

router = APIRouter()


class Health(BaseModel):
    status: Literal["ok"]


@router.get("/health", operation_id="get_health")
def get_health(session: ReadSession) -> Health:
    session.execute(text("SELECT 1"))
    return Health(status="ok")
