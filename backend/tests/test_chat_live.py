"""Manual end-to-end checks against the live model. Skipped unless RUN_LIVE_TESTS=1.

Run with OPENROUTER_API_KEY set:
    RUN_LIVE_TESTS=1 uv run pytest tests/test_chat_live.py
"""

import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from prelegal_backend.chat import router

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_LIVE_TESTS") != "1",
    reason="live LLM test: set RUN_LIVE_TESTS=1 to run",
)


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_positive_request_picks_the_nda_and_fills_its_fields(client: TestClient) -> None:
    body = {
        "messages": [
            {
                "role": "user",
                "content": "We want an NDA with Acme Ltd. The purpose is evaluating a "
                "partnership. Governing law is Delaware.",
            }
        ],
        "currentValues": {},
    }

    response = client.post("/api/chat", json=body)

    assert response.status_code == 200
    payload = response.json()
    assert payload["documentId"] == "Mutual-NDA"
    assert "Delaware" in payload["fieldUpdates"]["governingLaw"]


def test_unsupported_request_asks_questions_and_fills_nothing(client: TestClient) -> None:
    body = {
        "messages": [
            {
                "role": "user",
                "content": "I need an employment offer letter for a new hire.",
            }
        ],
        "currentValues": {},
    }

    response = client.post("/api/chat", json=body)

    assert response.status_code == 200
    payload = response.json()
    assert "?" in payload["reply"]
    assert payload["fieldUpdates"] == {}
