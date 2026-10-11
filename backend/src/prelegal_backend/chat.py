"""Mr. Legal: a chat endpoint that picks a legal document and collects its fields via an LLM."""

import json
import re
import unicodedata
from typing import Literal

import litellm
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from prelegal_backend.auth import current_user
from prelegal_backend.documents import DOCUMENTS, DOCUMENTS_BY_ID, Document, DocumentField

MODEL = "openrouter/openai/gpt-oss-120b"
# CoreWeave only. Pinning the fp4 quantization garbled extracted values (see Docs/lessons-learnt.md).
# Reasoning effort goes through OpenRouter's body field: LiteLLM rejects its reasoning_effort argument for this model.
EXTRA_BODY = {"provider": {"only": ["coreweave"]}, "reasoning": {"effort": "low"}}
# CoreWeave's shared pool is sometimes rate-limited (HTTP 429). Retry before failing the turn.
RETRIES = 3

YEARS_PATTERN = re.compile(r"[1-9]\d{0,2}")
DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")

DocumentId = Literal[tuple(DOCUMENTS_BY_ID)]  # type: ignore[valid-type]

router = APIRouter(prefix="/api/chat", tags=["chat"], dependencies=[Depends(current_user)])

SYSTEM_PROMPT = """You are Mr. Legal, a friendly assistant who helps the user draft legal agreements.
Hold a natural, friendly conversation. Ask only one question per reply: the most important missing detail, phrased conversationally, with a brief acknowledgement of what the user just told you. Do not list several questions at once. Never ask for a detail that is already set.
Always ask a clarifying question when a detail is missing, vague or ambiguous, and never end a reply without one while details are still missing.
Early in the conversation, say that you are not a lawyer and this is not legal advice.

Supported documents (documentId: name, then its fields as key (label; hint)):
{documents}

Choosing a document:
- When the user says what they want, set documentId to the matching supported document.
- If the user asks for a document that is not supported, do not draft it directly. Ask questions to learn what they need. Once you have enough to proceed, or the user asks you to draft it, choose the closest supported document, set documentId to it, and say in your reply which one you chose, why it is the closest match, and that it may not fit exactly. Never refuse to help with an unsupported document. Never write the document text in chat: the draft appears in the preview.
- If the user asks what you can help with, list the supported documents by name, and say you can only offer limited help with other agreements.

Filling fields:
- Set fieldUpdates only for fields of the chosen document, and only when this turn gives a new value. Leave a field null if it did not change.
- Copy names and places exactly as the user wrote them.
- Use the hints for formats. Dates are YYYY-MM-DD. Term lengths are digits only, e.g. "2".

Reply with JSON only, matching the schema:
- reply: your message to the user.
- documentId: the chosen supported document, or null if none is chosen yet.
- fieldUpdates: the new field values, keyed by field key.

Current document: {current_document}
Current values (JSON): {current_values}
"""


class CamelModel(BaseModel):
    """Base model that reads and writes camelCase keys, as the frontend uses."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, str_strip_whitespace=True)


class MrLegalTurn(CamelModel):
    """The model's structured reply for one conversation turn."""

    reply: str
    document_id: DocumentId | None
    field_updates: dict[str, str | None]


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    messages: list[ChatMessage]
    document_id: str | None = None
    current_values: dict[str, str] = {}


class ChatResponse(CamelModel):
    reply: str
    document_id: str | None
    field_updates: dict[str, str]


def describe_document(document: Document) -> str:
    """Describe one document and its fields for the prompt."""
    fields = "; ".join(_describe_field(field) for field in document.fields)
    return f"- {document.id}: {document.name}. {document.description} Fields: {fields}"


def _describe_field(field: DocumentField) -> str:
    """Describe one field, with its allowed values when it has a fixed set."""
    detail = f"{field.label}; {field.hint}" if field.hint else field.label
    if field.options:
        detail += f"; one of {'|'.join(field.options)}"
    return f"{field.key} ({detail})"


def system_prompt(request: ChatRequest) -> str:
    """Build the system prompt with the supported documents and the current state."""
    documents = "\n".join(describe_document(document) for document in DOCUMENTS)
    current_document = request.document_id or "none chosen yet"
    current_values = json.dumps(request.current_values, ensure_ascii=False)
    return SYSTEM_PROMPT.format(
        documents=documents, current_document=current_document, current_values=current_values
    )


def clean_text(value: str) -> str | None:
    """Drop text containing invisible or non-space separator characters, which the model sometimes emits as noise."""
    if any(unicodedata.category(char) in ("Cf", "Zs") and char != " " for char in value):
        return None
    return value


def clean_value(field: DocumentField, value: str) -> str | None:
    """Keep a value only when it fits the field: one of its options, a whole number of years, an ISO date, or clean text."""
    value = value.strip()
    if not value:
        return None
    if field.options:
        return value if value in field.options else None
    if field.key.endswith("Years"):
        return value if YEARS_PATTERN.fullmatch(value) else None
    if field.key.lower().endswith("date"):
        return value if DATE_PATTERN.fullmatch(value) else None
    return clean_text(value)


def document_updates(document: Document, raw_updates: dict[str, str | None]) -> dict[str, str]:
    """Keep only the document's known fields whose values pass validation."""
    updates = {}
    for key, value in raw_updates.items():
        field = document.field(key)
        cleaned = clean_value(field, value) if field and value is not None else None
        if cleaned is not None:
            updates[key] = cleaned
    return updates


async def chat_turn(request: ChatRequest) -> ChatResponse:
    """Send the conversation to the model and return its reply with validated field values."""
    response = await litellm.acompletion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt(request)},
            *(message.model_dump() for message in request.messages),
        ],
        response_format=MrLegalTurn,
        extra_body=EXTRA_BODY,
        num_retries=RETRIES,
    )
    turn = MrLegalTurn.model_validate_json(response.choices[0].message.content)
    document_id = turn.document_id or request.document_id
    updates = document_updates(DOCUMENTS_BY_ID[document_id], turn.field_updates) if document_id else {}
    return ChatResponse(reply=turn.reply, document_id=document_id, field_updates=updates)


@router.post("")
async def chat(request: ChatRequest) -> ChatResponse:
    """Chat with Mr. Legal about any supported legal document."""
    try:
        return await chat_turn(request)
    except litellm.RateLimitError as error:
        raise HTTPException(status_code=503, detail="Mr. Legal is busy right now. Please try again in a moment.") from error
