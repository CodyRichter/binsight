import base64
from collections.abc import Callable, Iterator
from contextlib import AbstractContextManager, contextmanager

import anyio
from fastapi import FastAPI
from mcp.types import CallToolResult, ImageContent, TextContent
from pydantic import BaseModel, ValidationError
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core.database import open_write_session
from app.core.errors import AppError, ErrorBody, ErrorResponse, validation_failed
from app.core.settings import Settings
from app.features.attachments import service as attachments
from app.features.attachments.service import StoredPhoto

type OpenSession = Callable[[Engine], AbstractContextManager[Session]]


def _answer(result: BaseModel) -> CallToolResult:
    return CallToolResult(
        content=[TextContent(type="text", text=result.model_dump_json())],
        structured_content=result.model_dump(mode="json"),
    )


def _refusal(error: AppError) -> CallToolResult:
    body = ErrorBody(code=error.code, message=error.message, details=error.details)
    text = ErrorResponse(error=body).model_dump_json()
    return CallToolResult(content=[TextContent(type="text", text=text)], is_error=True)


def _image(mime_type: str) -> Callable[[bytes], CallToolResult]:
    def answer(image: bytes) -> CallToolResult:
        data = base64.b64encode(image).decode()
        content = ImageContent(type="image", data=data, mime_type=mime_type)
        return CallToolResult(content=[content])

    return answer


async def _run[T](
    app: FastAPI,
    open_session: OpenSession,
    action: Callable[[Session], T],
    answer: Callable[[T], CallToolResult],
) -> CallToolResult:
    def run() -> CallToolResult:
        try:
            with open_session(app.state.engine) as session:
                result = action(session)
        except ValidationError as error:
            return _refusal(validation_failed(error))
        except AppError as error:
            return _refusal(error)
        return answer(result)

    return await anyio.to_thread.run_sync(run)


async def run_action(
    app: FastAPI, open_session: OpenSession, action: Callable[[Session], BaseModel]
) -> CallToolResult:
    """Run one tool's service call in a worker thread, answering or refusing as the API does."""
    return await _run(app, open_session, action, _answer)


async def run_image_action(
    app: FastAPI, open_session: OpenSession, action: Callable[[Session], bytes], mime_type: str
) -> CallToolResult:
    """Run a service call that gives an image in a worker thread, answering with the image."""
    return await _run(app, open_session, action, _image(mime_type))


async def run_photo_action(
    app: FastAPI, photo_base64: str, action: Callable[[Session, StoredPhoto], BaseModel]
) -> CallToolResult:
    """Store a photo sent as base64, then record it in its own write transaction."""
    settings: Settings = app.state.settings
    stored: list[StoredPhoto] = []

    @contextmanager
    def open_session(engine: Engine) -> Iterator[Session]:
        raw = attachments.photo_from_base64(photo_base64)
        with (
            attachments.saved_photo(settings, raw, None) as photo,
            open_write_session(engine) as session,
        ):
            stored.append(photo)
            yield session

    return await _run(app, open_session, lambda session: action(session, stored[0]), _answer)
