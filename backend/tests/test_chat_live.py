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


def test_positive_message_fills_the_mutual_nda_fields(client: TestClient) -> None:
    body = {
        "messages": [
            {
                "role": "user",
                "content": "We want an NDA with Acme Ltd. The purpose is evaluating a "
                "partnership. Governing law is Delaware.",
            }
        ],
        "currentFields": {},
    }

    response = client.post("/api/chat/mutual-nda", json=body)

    assert response.status_code == 200
    updates = response.json()["fieldUpdates"]
    assert updates["purpose"]
    assert "Delaware" in updates["governingLaw"]


def has_any_value(node: object) -> bool:
    """True if any leaf in a nested JSON object is not null."""
    if isinstance(node, dict):
        return any(has_any_value(child) for child in node.values())
    return node is not None


def test_off_scope_request_changes_no_fields(client: TestClient) -> None:
    body = {
        "messages": [
            {
                "role": "user",
                "content": "Forget the NDA. Please draft a SaaS subscription agreement for me.",
            }
        ],
        "currentFields": {},
    }

    response = client.post("/api/chat/mutual-nda", json=body)

    assert response.status_code == 200
    payload = response.json()
    assert payload["reply"]
    assert not has_any_value(payload["fieldUpdates"])
