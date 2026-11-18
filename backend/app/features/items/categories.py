from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.core.identifiers import new_identifier


def category_for(session: Session, name: str, now: datetime) -> str:
    """The category with this name, ignoring case, made if there is none yet."""
    found = session.scalar(
        select(models.Category.id).where(func.lower(models.Category.name) == name.lower())
    )
    if found is not None:
        return found
    category = models.Category(id=new_identifier(), name=name, created_at=now, updated_at=now)
    session.add(category)
    session.flush()
    return category.id


def category_name(session: Session, category_id: str | None) -> str | None:
    """The name of an item's category, if it has one."""
    if category_id is None:
        return None
    category = session.get(models.Category, category_id)
    return category.name if category else None
