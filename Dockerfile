# Stage 1: build the static frontend. It reads ../templates at build time.
FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY templates /app/templates
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: FastAPI backend that also serves the static frontend on port 8000.
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app/backend
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/backend/.venv/bin:$PATH" \
    DATABASE_PATH=/app/data/prelegal.db \
    STATIC_DIR=/app/frontend/out
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/src ./src
RUN uv sync --frozen --no-dev
COPY --from=frontend-build /app/frontend/out /app/frontend/out
VOLUME /app/data
EXPOSE 8000
CMD ["uvicorn", "prelegal_backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
