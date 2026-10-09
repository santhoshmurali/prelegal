"""FastAPI app: health endpoint, temporary database and the static frontend."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from prelegal_backend.db import database_path, init_database

DEFAULT_STATIC_DIR = Path(os.environ.get("STATIC_DIR", "../frontend/out"))


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Prepare the temporary database before serving requests."""
    init_database(database_path())
    yield


def create_app(static_dir: Path = DEFAULT_STATIC_DIR) -> FastAPI:
    """Build the app, serving the frontend build when it exists."""
    app = FastAPI(title="Prelegal", lifespan=lifespan)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    if static_dir.is_dir():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")

    return app


app = create_app()
