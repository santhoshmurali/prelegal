import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from prelegal_backend.main import create_app


@pytest.fixture
def database_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "data" / "test.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    return path


def test_health_returns_ok(database_file: Path, tmp_path: Path) -> None:
    with TestClient(create_app(static_dir=tmp_path / "missing")) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_database_is_created_from_scratch_with_users_table(
    database_file: Path, tmp_path: Path
) -> None:
    assert not database_file.exists()

    with TestClient(create_app(static_dir=tmp_path / "missing")):
        pass

    with sqlite3.connect(database_file) as connection:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    assert ("users",) in tables


def test_frontend_build_is_served_at_root(database_file: Path, tmp_path: Path) -> None:
    static_dir = tmp_path / "out"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<h1>Prelegal</h1>")

    with TestClient(create_app(static_dir=static_dir)) as client:
        root = client.get("/")
        health = client.get("/api/health")

    assert root.status_code == 200
    assert "Prelegal" in root.text
    assert health.json() == {"status": "ok"}


def test_root_is_not_found_without_frontend_build(database_file: Path, tmp_path: Path) -> None:
    with TestClient(create_app(static_dir=tmp_path / "missing")) as client:
        response = client.get("/")

    assert response.status_code == 404
