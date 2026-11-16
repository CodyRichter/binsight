"""Check the repository's layout and the size limits that linters cannot."""

import ast
import re
import sys
from collections.abc import Iterator
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_FEATURES = ROOT / "backend/app/features"
FRONTEND_FEATURES = ROOT / "frontend/src/features"
FRONTEND_ONLY_FEATURES = {"scan"}
FEATURE_FILES = {"service.py", "schemas.py", "routes.py", "__init__.py"}
BANNED_STEMS = {"utils", "util", "helpers", "helper", "common", "misc"}
SOURCE_ROOTS = ("backend/app", "frontend/src", "scripts")
SKIPPED_DIRS = {".git", ".venv", "node_modules", ".next", "__pycache__"}
MAX_AGENTS_LINES = 200
MAX_FILE_LINES = 300
MAX_FUNCTION_LINES = 40


def tracked_files(suffix: str = "") -> Iterator[Path]:
    """Yield every file in the repository that is not tooling output."""
    for path in ROOT.rglob(f"*{suffix}"):
        if path.is_file() and not SKIPPED_DIRS.intersection(path.parts):
            yield path


def folder_names(folder: Path) -> set[str]:
    return {child.name for child in folder.iterdir() if child.is_dir()}


def check_feature_folders_match() -> Iterator[str]:
    backend = {name.replace("_", "-") for name in folder_names(BACKEND_FEATURES)}
    frontend = folder_names(FRONTEND_FEATURES) - FRONTEND_ONLY_FEATURES
    for name in sorted(backend - frontend):
        yield f"feature '{name}' is in the backend but not the frontend"
    for name in sorted(frontend - backend):
        yield f"feature '{name}' is in the frontend but not the backend"


def check_readme_lists_features() -> Iterator[str]:
    readme = (ROOT / "README.md").read_text()
    listed = set(re.findall(r"^\| `(\w+)`", readme, flags=re.MULTILINE))
    actual = folder_names(BACKEND_FEATURES) | FRONTEND_ONLY_FEATURES
    for name in sorted(actual - listed):
        yield f"feature '{name}' is missing from the README feature table"
    for name in sorted(listed - actual):
        yield f"README lists feature '{name}', which has no folder"


def check_feature_file_layout() -> Iterator[str]:
    for feature in sorted(BACKEND_FEATURES.iterdir()):
        python_files = {path.name for path in feature.glob("*.py")}
        if not python_files:
            continue
        for name in sorted(FEATURE_FILES - python_files):
            yield f"{feature.relative_to(ROOT)} is missing {name}"
        for name in sorted(python_files - FEATURE_FILES):
            yield f"{feature.relative_to(ROOT)}/{name} is not one of the allowed feature files"


def check_agent_files() -> Iterator[str]:
    for agents in tracked_files("AGENTS.md"):
        relative = agents.relative_to(ROOT)
        lines = len(agents.read_text().splitlines())
        if lines > MAX_AGENTS_LINES:
            yield f"{relative} has {lines} lines; the limit is {MAX_AGENTS_LINES}"
        shim = agents.with_name("CLAUDE.md")
        if not shim.exists() or "@AGENTS.md" not in shim.read_text():
            yield f"{relative} needs a CLAUDE.md beside it containing '@AGENTS.md'"


def check_banned_file_names() -> Iterator[str]:
    for source_root in SOURCE_ROOTS:
        for path in (ROOT / source_root).rglob("*.*"):
            if path.stem.lower() in BANNED_STEMS and not SKIPPED_DIRS.intersection(path.parts):
                yield f"{path.relative_to(ROOT)}: name the file after what it does"


def check_placeholders() -> Iterator[str]:
    for keep in tracked_files(".keep"):
        if len(list(keep.parent.iterdir())) > 1:
            yield f"{keep.relative_to(ROOT)} is no longer needed; the folder has other files"


def check_python_sizes() -> Iterator[str]:
    for path in tracked_files(".py"):
        relative = path.relative_to(ROOT)
        source = path.read_text()
        lines = len(source.splitlines())
        if lines > MAX_FILE_LINES and "tests" not in relative.parts:
            yield f"{relative} has {lines} lines; the limit is {MAX_FILE_LINES}"
        for node in ast.walk(ast.parse(source)):
            if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
                length = (node.end_lineno or node.lineno) - node.lineno + 1
                if length > MAX_FUNCTION_LINES:
                    yield (
                        f"{relative}:{node.lineno} {node.name}() has {length} lines; "
                        f"the limit is {MAX_FUNCTION_LINES}"
                    )


CHECKS = (
    check_feature_folders_match,
    check_readme_lists_features,
    check_feature_file_layout,
    check_agent_files,
    check_banned_file_names,
    check_placeholders,
    check_python_sizes,
)


def main() -> int:
    problems = [problem for check in CHECKS for problem in check()]
    for problem in problems:
        print(problem, file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
