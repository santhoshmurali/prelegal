from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from prelegal_backend.main import create_app

NDA_DRAFT = {
    "documentId": "Mutual-NDA",
    "title": "Mutual NDA - Ana",
    "values": {"purpose": "Evaluating a partnership.", "bogus": "x", "mndaTermYears": "not a year"},
}


@pytest.fixture
def database_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "data" / "test.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    monkeypatch.setenv("SEED_USERNAME", "admin")
    monkeypatch.setenv("SEED_PASSWORD", "seed-password-1")
    return path


@pytest.fixture
def ana(database_file: Path, tmp_path: Path):
    """A signed-in user with their own cookie jar."""
    with TestClient(create_app(static_dir=tmp_path / "missing")) as client:
        client.post("/api/auth/signup", json={"username": "ana", "password": "ana-password-1"})
        yield client


@pytest.fixture
def bob(ana: TestClient) -> TestClient:
    """A second signed-in user, in a separate client so the cookies stay apart."""
    other = TestClient(ana.app)
    other.post("/api/auth/signup", json={"username": "bob", "password": "bob-password-1"})
    return other


def test_saving_keeps_only_valid_known_values(ana: TestClient) -> None:
    response = ana.post("/api/documents", json=NDA_DRAFT)

    assert response.status_code == 201
    body = response.json()
    assert body["documentId"] == "Mutual-NDA"
    assert body["title"] == "Mutual NDA - Ana"
    assert body["values"] == {"purpose": "Evaluating a partnership."}


def test_list_returns_only_my_drafts_newest_first(ana: TestClient, bob: TestClient) -> None:
    first = ana.post("/api/documents", json=NDA_DRAFT).json()
    second = ana.post("/api/documents", json={**NDA_DRAFT, "title": "Second"}).json()
    bob.post("/api/documents", json=NDA_DRAFT)

    listed = ana.get("/api/documents").json()

    assert [draft["id"] for draft in listed] == [second["id"], first["id"]]
    assert all("values" not in draft for draft in listed)


def test_reopening_returns_the_saved_values(ana: TestClient) -> None:
    draft_id = ana.post("/api/documents", json=NDA_DRAFT).json()["id"]

    response = ana.get(f"/api/documents/{draft_id}")

    assert response.status_code == 200
    assert response.json()["values"] == {"purpose": "Evaluating a partnership."}


def test_other_users_cannot_read_or_change_a_draft(ana: TestClient, bob: TestClient) -> None:
    draft_id = ana.post("/api/documents", json=NDA_DRAFT).json()["id"]

    assert bob.get(f"/api/documents/{draft_id}").status_code == 404
    assert bob.put(f"/api/documents/{draft_id}", json=NDA_DRAFT).status_code == 404


def test_update_overwrites_title_and_values(ana: TestClient) -> None:
    draft_id = ana.post("/api/documents", json=NDA_DRAFT).json()["id"]

    response = ana.put(
        f"/api/documents/{draft_id}",
        json={"documentId": "Mutual-NDA", "title": "Renamed", "values": {"governingLaw": "Delaware"}},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Renamed"
    assert response.json()["values"] == {"governingLaw": "Delaware"}


def test_unknown_document_is_rejected(ana: TestClient) -> None:
    response = ana.post("/api/documents", json={**NDA_DRAFT, "documentId": "Not-A-Document"})

    assert response.status_code == 422


def test_drafts_require_a_session(database_file: Path, tmp_path: Path) -> None:
    with TestClient(create_app(static_dir=tmp_path / "missing")) as signed_out:
        assert signed_out.get("/api/documents").status_code == 401
        assert signed_out.post("/api/documents", json=NDA_DRAFT).status_code == 401
