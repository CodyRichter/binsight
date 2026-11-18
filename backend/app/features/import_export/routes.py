from typing import Annotated

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.core import clock
from app.core.database import ReadSession, open_write_session
from app.core.errors import refusals
from app.core.settings import AppSettings
from app.features.import_export import service
from app.features.import_export.schemas import ContentsSheet, ImportDone, InsuranceList
from app.models import Actor

router = APIRouter()


@router.get(
    "/export",
    operation_id="export_everything",
    response_class=FileResponse,
    responses={200: {"content": {"application/zip": {}}}},
)
def export_everything(session: ReadSession, settings: AppSettings) -> FileResponse:
    export = service.export_everything(session, settings, clock.now())
    # The zip is made for this one download, so it goes once it has been sent.
    return FileResponse(
        export.path,
        media_type=export.content_type,
        filename=export.filename,
        background=BackgroundTask(export.path.unlink),
    )


@router.post("/import", operation_id="import_items", responses=refusals(404, 422))
def import_items(request: Request, csv: Annotated[UploadFile, File()]) -> ImportDone:
    raw = csv.file.read(service.MAX_CSV_BYTES + 1)
    # The file is read before the write transaction starts, so the lock is held only briefly.
    with open_write_session(request.app.state.engine) as session:
        return service.import_items(session, raw, Actor.app, clock.now())


@router.get("/insurance-list", operation_id="get_insurance_list", responses=refusals(404))
def get_insurance_list(session: ReadSession, location_id: str | None = None) -> InsuranceList:
    return service.get_insurance_list(session, location_id, clock.now())


@router.get(
    "/contents-sheet/{location_id}", operation_id="get_contents_sheet", responses=refusals(404)
)
def get_contents_sheet(location_id: str, session: ReadSession) -> ContentsSheet:
    return service.get_contents_sheet(session, location_id)
