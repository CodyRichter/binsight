import csv
from decimal import Decimal, InvalidOperation
from io import StringIO
from typing import Any

from pydantic import ValidationError

from app.core.errors import AppError, validation_failed
from app.features.import_export.schemas import COLUMNS, ImportProblem, ImportRow
from app.features.items.service import ImportedItem

MAX_CSV_BYTES = 5 * 1024 * 1024
MAX_PROBLEMS = 50
PATH_SEPARATOR = ">"
# Where a field's name differs from the column it is read from.
FIELD_COLUMNS = {"price_cents": "price"}


def unsupported_csv() -> AppError:
    """The refusal for an upload that is not a CSV file of text."""
    return AppError(422, "unsupported_file", "That file can't be imported; send a CSV file.")


def rows_invalid(problems: list[ImportProblem]) -> AppError:
    """The refusal for a file with rows that can't be imported, saying where."""
    shown = problems[:MAX_PROBLEMS]
    first = shown[0]
    return AppError(
        422,
        "import_rows_invalid",
        f"Nothing was imported: row {first.row} has a problem ({first.message})",
        {"rows": [problem.model_dump() for problem in shown]},
    )


def _text(raw: bytes) -> str:
    if len(raw) > MAX_CSV_BYTES:
        raise AppError(422, "file_too_large", "That file is too large; send at most 5 MB.")
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise unsupported_csv() from error


def _price_cents(text: str) -> int | str:
    try:
        cents = Decimal(text.replace(",", "")) * 100
    except InvalidOperation:
        return text
    return int(cents) if cents == cents.to_integral_value() else text


def _fields(cells: dict[str, str]) -> dict[str, Any]:
    given: dict[str, Any] = {
        column: value.strip()
        for column, value in cells.items()
        if isinstance(value, str) and value.strip()
    }
    given.pop("location", None)
    if "tags" in given:
        given["tags"] = [tag for tag in given["tags"].split(";") if tag.strip()]
    if "price" in given:
        given["price_cents"] = _price_cents(given.pop("price"))
    return given


def _path(cells: dict[str, str]) -> tuple[str, ...]:
    steps = (cells.get("location") or "").split(PATH_SEPARATOR)
    return tuple(step.strip() for step in steps if step.strip())


def _column(field: str) -> str | None:
    # A rule about the row as a whole, such as lending needing a name, names no column.
    column = FIELD_COLUMNS.get(field.split(".")[0], field.split(".")[0])
    return column if column in COLUMNS else None


def _row(number: int, cells: dict[str, str]) -> ImportRow | list[ImportProblem]:
    try:
        item = ImportedItem(**_fields(cells))
    except ValidationError as error:
        fields: dict[str, str] = validation_failed(error).details["fields"]
        return [
            ImportProblem(row=number, column=_column(field), message=message)
            for field, message in fields.items()
        ]
    return ImportRow(row=number, item=item, path=_path(cells))


def _header(reader: csv.DictReader[str]) -> list[str]:
    header = [column.strip() for column in reader.fieldnames or []]
    unknown = [column for column in header if column not in COLUMNS]
    if "name" not in header or unknown:
        named = ", ".join(unknown) or "no name column"
        raise rows_invalid(
            [ImportProblem(row=1, column=None, message=f"Unknown or missing columns: {named}.")]
        )
    return header


def read_rows(raw: bytes) -> list[ImportRow]:
    """The rows of an uploaded CSV file, refused whole if any row can't be imported."""
    reader = csv.DictReader(StringIO(_text(raw)))
    try:
        reader.fieldnames = _header(reader)
        rows = [
            {column: value for column, value in record.items() if isinstance(column, str)}
            for record in reader
        ]
    except csv.Error as error:
        raise unsupported_csv() from error
    if not rows:
        raise rows_invalid([ImportProblem(row=2, column=None, message="The file has no rows.")])
    read = [_row(number, cells) for number, cells in enumerate(rows, start=2)]
    problems = [problem for result in read if isinstance(result, list) for problem in result]
    if problems:
        raise rows_invalid(problems)
    return [result for result in read if isinstance(result, ImportRow)]
