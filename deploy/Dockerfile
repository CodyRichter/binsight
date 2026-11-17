# syntax=docker/dockerfile:1
# Built from the repository root: docker build -f deploy/Dockerfile .

FROM node:26.13.1-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.15.2-slim
ENV UV_PYTHON_DOWNLOADS=never \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=from=ghcr.io/astral-sh/uv:0.13.8,source=/uv,target=/bin/uv \
    uv sync --locked --no-dev
COPY backend/app ./app
COPY backend/migrations ./migrations
COPY --from=frontend /app/frontend/dist /app/frontend/dist

ENV PATH=/app/backend/.venv/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
RUN groupadd --gid 1000 binsight \
    && useradd --uid 1000 --gid 1000 --no-create-home --shell /usr/sbin/nologin binsight \
    && mkdir /data \
    && chown binsight:binsight /data
VOLUME /data
USER binsight
EXPOSE 8000

# The slim image has no curl, so the check uses Python's standard library.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --start-interval=1s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"]

CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
