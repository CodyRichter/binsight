from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException


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


def refusals(*statuses: int) -> dict[int | str, dict[str, Any]]:
    """Describe the refusals a route can send, so they are part of the contract."""
    return {status: {"model": ErrorResponse} for status in statuses}


def error_response(error: AppError) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorBody(code=error.code, message=error.message, details=error.details)
    )
    return JSONResponse(status_code=error.status, content=body.model_dump())


def _field_name(location: tuple[int | str, ...]) -> str:
    # The first part says where the field was sent (body, query); the owner never sees that.
    return ".".join(str(part) for part in location[1:]) or str(location[0])


def _field_sentence(problem: dict[str, Any]) -> str:
    limits = problem.get("ctx", {})
    match problem["type"]:
        case "string_too_short":
            return f"Use at least {limits['min_length']} characters."
        case "string_too_long":
            return f"Use at most {limits['max_length']} characters."
        case "missing":
            return "Fill this in."
        case _:
            return f"{problem['msg'].rstrip('.')}."


def validation_failed(error: RequestValidationError) -> AppError:
    fields = {_field_name(problem["loc"]): _field_sentence(problem) for problem in error.errors()}
    message = next(iter(fields.values())) if len(fields) == 1 else "Some fields are not valid."
    return AppError(422, "validation_failed", message, {"fields": fields})


def http_refusal(error: HTTPException) -> AppError:
    status = HTTPStatus(error.status_code)
    code = status.phrase.lower().replace(" ", "_")
    return AppError(status.value, code, f"{status.description}.")


def add_error_handlers(app: FastAPI) -> None:
    """Send every refusal as the error shape in docs/api-conventions.md."""

    @app.exception_handler(AppError)
    def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
        return error_response(error)

    @app.exception_handler(RequestValidationError)
    def handle_validation_error(_request: Request, error: RequestValidationError) -> JSONResponse:
        return error_response(validation_failed(error))

    @app.exception_handler(HTTPException)
    def handle_http_error(_request: Request, error: HTTPException) -> JSONResponse:
        return error_response(http_refusal(error))
