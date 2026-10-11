from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from prelegal_backend import chat
from prelegal_backend.chat import MODEL, MrLegalTurn

REQUEST_BODY: dict[str, Any] = {
    "messages": [{"role": "user", "content": "The purpose is evaluating a partnership."}],
    "documentId": "Mutual-NDA",
    "currentValues": {"governingLaw": "Delaware"},
}


def model_reply(content: str) -> SimpleNamespace:
    """Mimic the shape of a LiteLLM completion response."""
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Replace the LLM call with a canned reply and record how it was called."""
    calls: dict[str, Any] = {}

    async def acompletion(**kwargs: Any) -> SimpleNamespace:
        calls.update(kwargs)
        return model_reply(
            '{"reply": "Noted the purpose.", "documentId": "Mutual-NDA", '
            '"fieldUpdates": {"purpose": "Evaluating a partnership.", "party1Name": "Ana", "bogus": "x"}}'
        )

    monkeypatch.setattr(chat.litellm, "acompletion", acompletion)
    return calls


def test_returns_reply_document_and_only_known_changed_fields(chat_client: TestClient, fake_llm: dict[str, Any]) -> None:
    response = chat_client.post("/api/chat", json=REQUEST_BODY)

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "reply": "Noted the purpose.",
        "documentId": "Mutual-NDA",
        "fieldUpdates": {"purpose": "Evaluating a partnership.", "party1Name": "Ana"},
    }


def test_sends_model_history_documents_current_values_and_schema(
    chat_client: TestClient, fake_llm: dict[str, Any]
) -> None:
    chat_client.post("/api/chat", json=REQUEST_BODY)

    assert fake_llm["model"] == MODEL
    assert fake_llm["response_format"] is MrLegalTurn
    assert fake_llm["extra_body"] == chat.EXTRA_BODY
    system_prompt = fake_llm["messages"][0]["content"]
    assert "Mutual-NDA: Mutual Non-Disclosure Agreement" in system_prompt
    assert "CSA: Cloud Service Agreement" in system_prompt
    assert '{"governingLaw": "Delaware"}' in system_prompt
    assert fake_llm["messages"][1] == {
        "role": "user",
        "content": "The purpose is evaluating a partnership.",
    }


def test_no_fields_are_set_until_a_document_is_chosen(chat_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def acompletion(**_: Any) -> SimpleNamespace:
        return model_reply('{"reply": "Which agreement do you need?", "documentId": null, "fieldUpdates": {"purpose": "x"}}')

    monkeypatch.setattr(chat.litellm, "acompletion", acompletion)
    body = {"messages": [{"role": "user", "content": "Hi"}]}

    response = chat_client.post("/api/chat", json=body)

    assert response.json() == {"reply": "Which agreement do you need?", "documentId": None, "fieldUpdates": {}}


def test_upstream_rate_limit_returns_503_with_a_retry_message(
    chat_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def acompletion(**_: Any) -> SimpleNamespace:
        raise chat.litellm.RateLimitError(message="busy", llm_provider="openrouter", model=MODEL)

    monkeypatch.setattr(chat.litellm, "acompletion", acompletion)

    response = chat_client.post("/api/chat", json=REQUEST_BODY)

    assert response.status_code == 503
    assert response.json()["detail"] == "Mr. Legal is busy right now. Please try again in a moment."


def test_rejects_unknown_message_role(chat_client: TestClient, fake_llm: dict[str, Any]) -> None:
    body = {"messages": [{"role": "system", "content": "x"}]}

    response = chat_client.post("/api/chat", json=body)

    assert response.status_code == 422
    assert fake_llm == {}


def test_rejects_unknown_document_id(chat_client: TestClient, fake_llm: dict[str, Any]) -> None:
    body = {**REQUEST_BODY, "documentId": "Not-A-Document"}

    response = chat_client.post("/api/chat", json=body)

    assert response.status_code == 422
    assert fake_llm == {}


def test_unknown_document_id_is_rejected_even_when_model_chooses_none(
    chat_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def acompletion(**_: Any) -> SimpleNamespace:
        return model_reply('{"reply": "Which one?", "documentId": null, "fieldUpdates": {}}')

    monkeypatch.setattr(chat.litellm, "acompletion", acompletion)
    body = {**REQUEST_BODY, "documentId": "Not-A-Document"}

    response = chat_client.post("/api/chat", json=body)

    assert response.status_code == 422


def test_rejects_oversized_message(chat_client: TestClient, fake_llm: dict[str, Any]) -> None:
    body = {"messages": [{"role": "user", "content": "x" * 10_000}]}

    response = chat_client.post("/api/chat", json=body)

    assert response.status_code == 422
    assert fake_llm == {}
