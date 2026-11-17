import base64
from collections.abc import Callable
from contextlib import AbstractContextManager

import anyio
from fastapi import FastAPI
from mcp.types import CallToolResult, ImageContent, TextContent
from pydantic import BaseModel, ValidationError
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorBody, ErrorResponse, validation_failed

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


def _png(image: bytes) -> CallToolResult:
    data = base64.b64encode(image).decode()
    return CallToolResult(content=[ImageContent(type="image", data=data, mime_type="image/png")])


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
    app: FastAPI, open_session: OpenSession, action: Callable[[Session], bytes]
) -> CallToolResult:
    """Run a service call that draws a PNG in a worker thread, answering with the image."""
    return await _run(app, open_session, action, _png)
