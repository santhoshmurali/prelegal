"""Manual end-to-end checks against the live model. Skipped unless RUN_LIVE_TESTS=1.

Run with OPENROUTER_API_KEY set:
    RUN_LIVE_TESTS=1 uv run pytest tests/test_chat_live.py
"""

import os

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_LIVE_TESTS") != "1",
    reason="live LLM test: set RUN_LIVE_TESTS=1 to run",
)


def test_positive_request_picks_the_nda_and_fills_its_fields(chat_client: TestClient) -> None:
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

    response = chat_client.post("/api/chat", json=body)

    assert response.status_code == 200
    payload = response.json()
    assert payload["documentId"] == "Mutual-NDA"
    assert "Delaware" in payload["fieldUpdates"]["governingLaw"]


def test_unsupported_request_asks_questions_and_fills_nothing(chat_client: TestClient) -> None:
    body = {
        "messages": [
            {
                "role": "user",
                "content": "I need an employment offer letter for a new hire.",
            }
        ],
        "currentValues": {},
    }

    response = chat_client.post("/api/chat", json=body)

    assert response.status_code == 200
    payload = response.json()
    assert "?" in payload["reply"]
    assert payload["fieldUpdates"] == {}
