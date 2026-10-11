import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from prelegal_backend.auth import hash_password, verify_password
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
def client(database_file: Path, tmp_path: Path) -> TestClient:
    with TestClient(create_app(static_dir=tmp_path / "missing")) as test_client:
        yield test_client


def sign_in(client: TestClient, username: str, password: str):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def test_password_hash_verifies_only_the_right_password() -> None:
    stored = hash_password("correct-horse")

    assert verify_password("correct-horse", stored)
    assert not verify_password("wrong-horse", stored)


def test_admin_is_seeded_on_a_fresh_database(database_file: Path, client: TestClient) -> None:
    with sqlite3.connect(database_file) as connection:
        rows = connection.execute("SELECT username, is_admin FROM users").fetchall()

    assert rows == [(SEED_USERNAME, 1)]


def test_seed_does_not_run_when_accounts_exist(database_file: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    with TestClient(create_app(static_dir=tmp_path / "missing")):
        pass
    monkeypatch.setenv("SEED_USERNAME", "second-admin")

    with TestClient(create_app(static_dir=tmp_path / "missing")):
        pass

    with sqlite3.connect(database_file) as connection:
        usernames = connection.execute("SELECT username FROM users").fetchall()
    assert usernames == [(SEED_USERNAME,)]


def test_sign_in_sets_session_cookie_and_me_returns_user(client: TestClient) -> None:
    response = sign_in(client, SEED_USERNAME, SEED_PASSWORD)

    assert response.status_code == 200
    assert response.json() == {"id": 1, "username": SEED_USERNAME, "isAdmin": True}
    assert "prelegal_session" in response.cookies
    assert client.get("/api/auth/me").json()["username"] == SEED_USERNAME


def test_wrong_password_is_rejected(client: TestClient) -> None:
    response = sign_in(client, SEED_USERNAME, "not-the-password")

    assert response.status_code == 401
    assert "prelegal_session" not in response.cookies


def test_me_requires_a_session(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_logout_ends_the_session(client: TestClient) -> None:
    sign_in(client, SEED_USERNAME, SEED_PASSWORD)

    logout = client.post("/api/auth/logout")

    assert logout.status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_chat_requires_a_session(client: TestClient) -> None:
    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hi"}], "documentId": None, "currentValues": {}},
    )

    assert response.status_code == 401


def test_deactivated_account_loses_access_immediately(database_file: Path, client: TestClient) -> None:
    sign_in(client, SEED_USERNAME, SEED_PASSWORD)
    with sqlite3.connect(database_file) as connection:
        connection.execute("UPDATE users SET is_active = 0 WHERE username = ?", (SEED_USERNAME,))

    assert client.get("/api/auth/me").status_code == 401
    assert sign_in(client, SEED_USERNAME, SEED_PASSWORD).status_code == 403
