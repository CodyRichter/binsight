from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class AppError(Exception):
    """A refusal the owner or Claude can act on, sent as the one error shape."""

    def __init__(
        self, status: int, code: str, message: str, details: dict[str, Any] | None = None
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details or {}


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any]


class ErrorResponse(BaseModel):
    error: ErrorBody


def error_response(error: AppError) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorBody(code=error.code, message=error.message, details=error.details)
    )
    return JSONResponse(status_code=error.status, content=body.model_dump())


def add_error_handlers(app: FastAPI) -> None:
    """Send every refusal as the error shape in docs/api-conventions.md."""

    @app.exception_handler(AppError)
    def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
        return error_response(error)
