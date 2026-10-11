from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from prelegal_backend import chat
from prelegal_backend.chat import MODEL, MrLegalTurn, router

REQUEST_BODY: dict[str, Any] = {
    "messages": [{"role": "user", "content": "The purpose is evaluating a partnership."}],
    "currentFields": {"governingLaw": "Delaware"},
}


def model_reply(content: str) -> SimpleNamespace:
    """Mimic the shape of a LiteLLM completion response."""
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Replace the LLM call with a canned reply and record how it was called."""
    calls: dict[str, Any] = {}

    async def acompletion(**kwargs: Any) -> SimpleNamespace:
        calls.update(kwargs)
        return model_reply(
            '{"reply": "Noted the purpose.", '
            '"fieldUpdates": {"purpose": "Evaluating a partnership.", "party1": {"name": "Ana"}}}'
        )

    monkeypatch.setattr(chat.litellm, "acompletion", acompletion)
    return calls


def test_returns_reply_and_only_changed_fields(client: TestClient, fake_llm: dict[str, Any]) -> None:
    response = client.post("/api/chat/mutual-nda", json=REQUEST_BODY)

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Noted the purpose."
    assert body["fieldUpdates"]["purpose"] == "Evaluating a partnership."
    assert body["fieldUpdates"]["party1"]["name"] == "Ana"
    assert body["fieldUpdates"]["governingLaw"] is None


def test_sends_model_history_current_fields_and_schema(
    client: TestClient, fake_llm: dict[str, Any]
) -> None:
    client.post("/api/chat/mutual-nda", json=REQUEST_BODY)

    assert fake_llm["model"] == MODEL
    assert fake_llm["response_format"] is MrLegalTurn
    assert fake_llm["extra_body"] == chat.EXTRA_BODY
    system_prompt = fake_llm["messages"][0]["content"]
    assert '"governingLaw":"Delaware"' in system_prompt
    assert fake_llm["messages"][1] == {
        "role": "user",
        "content": "The purpose is evaluating a partnership.",
    }


def test_rejects_unknown_message_role(client: TestClient, fake_llm: dict[str, Any]) -> None:
    body = {"messages": [{"role": "system", "content": "x"}], "currentFields": {}}

    response = client.post("/api/chat/mutual-nda", json=body)

    assert response.status_code == 422
    assert fake_llm == {}
