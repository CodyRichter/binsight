"""Check the repository's layout and the limits that linters cannot."""

import ast
import re
import sys
from collections.abc import Iterator
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_FEATURES = ROOT / "backend/app/features"
FRONTEND_FEATURES = ROOT / "frontend/src/features"
FRONTEND_ONLY_FEATURES = {"scan"}
REQUIRED_FEATURE_FILES = {"service.py", "schemas.py", "routes.py", "__init__.py"}
BANNED_STEMS = {"utils", "util", "helpers", "helper", "common", "misc"}
SOURCE_ROOTS = ("backend/app", "frontend/src", "scripts")
SKIPPED_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    "__pycache__",
    ".ruff_cache",
    ".mypy_cache",
    ".pytest_cache",
    "graphify-out",
}
MAX_AGENTS_LINES = 200
MAX_FILE_LINES = 300
MAX_FUNCTION_LINES = 40


def repository_files(suffix: str = "") -> Iterator[Path]:
    """Yield every file in the repository that is not tooling output."""
    for folder, subfolders, names in ROOT.walk():
        subfolders[:] = [name for name in subfolders if name not in SKIPPED_DIRS]
        yield from (folder / name for name in names if name.endswith(suffix))


def folder_names(folder: Path) -> set[str]:
    if not folder.is_dir():
        return set()
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
    frontend = {name.replace("-", "_") for name in folder_names(FRONTEND_FEATURES)}
    for name in sorted((folder_names(BACKEND_FEATURES) | frontend) - listed):
        yield f"feature '{name}' is missing from the README feature table"


def check_feature_file_layout() -> Iterator[str]:
    for name in sorted(folder_names(BACKEND_FEATURES)):
        feature = BACKEND_FEATURES / name
        python_files = {path.name for path in feature.glob("*.py")}
        for missing in sorted(REQUIRED_FEATURE_FILES - python_files):
            yield f"{feature.relative_to(ROOT)} is missing {missing}"


def imported_names(tree: ast.Module) -> Iterator[str]:
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            yield from (alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            yield from (f"{node.module}.{alias.name}" for alias in node.names)


def check_feature_imports() -> Iterator[str]:
    for path in repository_files(".py"):
        if not path.is_relative_to(BACKEND_FEATURES):
            continue
        owner = path.relative_to(BACKEND_FEATURES).parts[0]
        for name in imported_names(ast.parse(path.read_text())):
            match = re.match(r"app\.features\.(\w+)\.(\w+)", name)
            if match and match[1] != owner and match[2] != "service":
                yield (
                    f"{path.relative_to(ROOT)} imports {name}; "
                    "use another feature only through its service"
                )


def check_agent_files() -> Iterator[str]:
    for agents in repository_files("AGENTS.md"):
        relative = agents.relative_to(ROOT)
        lines = len(agents.read_text().splitlines())
        if lines > MAX_AGENTS_LINES:
            yield f"{relative} has {lines} lines; the limit is {MAX_AGENTS_LINES}"
        shim = agents.with_name("CLAUDE.md")
        if not shim.exists() or "@AGENTS.md" not in shim.read_text():
            yield f"{relative} needs a CLAUDE.md beside it containing '@AGENTS.md'"


def check_banned_file_names() -> Iterator[str]:
    for path in repository_files():
        relative = path.relative_to(ROOT)
        in_source = relative.as_posix().startswith(SOURCE_ROOTS)
        if in_source and path.stem.lower() in BANNED_STEMS:
            yield f"{relative}: name the file after what it does"


def function_lengths(source: str) -> Iterator[tuple[str, int, int]]:
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            yield node.name, node.lineno, (node.end_lineno or node.lineno) - node.lineno + 1


def check_python_sizes() -> Iterator[str]:
    for path in repository_files(".py"):
        relative = path.relative_to(ROOT)
        source = path.read_text()
        lines = len(source.splitlines())
        if lines > MAX_FILE_LINES and "tests" not in relative.parts:
            yield f"{relative} has {lines} lines; the limit is {MAX_FILE_LINES}"
        for name, line, length in function_lengths(source):
            if length > MAX_FUNCTION_LINES:
                where = f"{relative}:{line} {name}()"
                yield f"{where} has {length} lines; the limit is {MAX_FUNCTION_LINES}"


CHECKS = (
    check_feature_folders_match,
    check_readme_lists_features,
    check_feature_file_layout,
    check_feature_imports,
    check_agent_files,
    check_banned_file_names,
    check_python_sizes,
)


def main() -> int:
    problems = [problem for check in CHECKS for problem in check()]
    for problem in problems:
        print(problem, file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
