"""Shared fixtures: a temporary database with a seeded admin, and test clients."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from prelegal_backend.auth import SessionUser, current_user
from prelegal_backend.chat import router as chat_router
from prelegal_backend.main import create_app

SEED_USERNAME = "admin"
SEED_PASSWORD = "seed-password-1"


@pytest.fixture
def database_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "data" / "test.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    monkeypatch.setenv("SEED_USERNAME", SEED_USERNAME)
    monkeypatch.setenv("SEED_PASSWORD", SEED_PASSWORD)
    return path


@pytest.fixture
def client(database_file: Path, tmp_path: Path) -> Iterator[TestClient]:
    """The full app without a frontend build, signed out."""
    with TestClient(create_app(static_dir=tmp_path / "missing")) as test_client:
        yield test_client


@pytest.fixture
def chat_client() -> TestClient:
    """Only the chat router, with a signed-in user and no database."""
    app = FastAPI()
    app.include_router(chat_router)
    app.dependency_overrides[current_user] = lambda: SessionUser(id=1, username="ana", is_admin=False)
    return TestClient(app)
