"""Mr. Legal: a chat endpoint that collects the Mutual NDA fields via an LLM."""

import re
import unicodedata
from typing import Annotated, Literal

import litellm
from fastapi import APIRouter
from pydantic import AfterValidator, BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

MODEL = "openrouter/openai/gpt-oss-120b"
# CoreWeave only. Pinning the fp4 quantization garbled extracted values (see Docs/lessons-learnt.md).
EXTRA_BODY = {"provider": {"only": ["coreweave"]}}

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = """You are Mr. Legal, a friendly assistant who helps the user fill in a Mutual Non-Disclosure Agreement (MNDA).
Hold a free-flowing conversation. When details are missing, ask for all of them in one message as a short numbered list, so the user can answer everything in a single reply.
Details to collect: purpose; effective date (YYYY-MM-DD); MNDA term (expires after N years, or continues until terminated); confidentiality term (N years, or in perpetuity); governing law (state); jurisdiction (city or county and state); modifications; and for each party: name, title, company, notice address and date.
Field formats: mndaTermYears and confidentialityYears are digits only, e.g. "2". effectiveDate and party dates are YYYY-MM-DD. Copy names and places exactly as the user wrote them. Whenever the user gives a term length for the MNDA, also set mndaTermType to "expires"; for a confidentiality term length, set confidentialityType to "years".
Early in the conversation, say that you are not a lawyer and this is not legal advice.
Only the Mutual NDA is in scope. If the user asks for another document or for legal advice, say briefly that you can only help with the Mutual NDA, and suggest a qualified lawyer for advice.

Reply with JSON only, matching the schema:
- reply: your message to the user.
- fieldUpdates: only the fields this turn changed. Leave a field null if it did not change.

Current values (JSON):
"""


class CamelModel(BaseModel):
    """Base model that reads and writes camelCase keys, as the frontend uses."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, str_strip_whitespace=True
    )


YEARS_PATTERN = re.compile(r"[1-9]\d{0,2}")
DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")


def clean_text(value: str | None) -> str | None:
    """Drop text containing invisible or non-space separator characters, which the model sometimes emits as noise."""
    if value and any(
        unicodedata.category(char) in ("Cf", "Zs") and char != " " for char in value
    ):
        return None
    return value


def valid_years(value: str | None) -> str | None:
    """Keep a term length only when it is a whole number of years."""
    return value if value and YEARS_PATTERN.fullmatch(value) else None


def valid_date(value: str | None) -> str | None:
    """Keep a date only when it is written YYYY-MM-DD."""
    return value if value and DATE_PATTERN.fullmatch(value) else None


Text = Annotated[str | None, AfterValidator(clean_text)]
Years = Annotated[str | None, AfterValidator(valid_years)]
IsoDate = Annotated[str | None, AfterValidator(valid_date)]


class PartyUpdate(CamelModel):
    name: Text = None
    title: Text = None
    company: Text = None
    notice_address: Text = None
    date: IsoDate = None


class NdaFieldUpdates(CamelModel):
    purpose: Text = None
    effective_date: IsoDate = None
    mnda_term_type: Literal["expires", "continues"] | None = None
    mnda_term_years: Years = None
    confidentiality_type: Literal["years", "perpetuity"] | None = None
    confidentiality_years: Years = None
    governing_law: Text = None
    jurisdiction: Text = None
    modifications: Text = None
    party1: PartyUpdate | None = None
    party2: PartyUpdate | None = None


class MrLegalTurn(CamelModel):
    """The model's structured reply for one conversation turn."""

    reply: str
    field_updates: NdaFieldUpdates


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class MutualNdaChatRequest(CamelModel):
    messages: list[ChatMessage]
    current_fields: NdaFieldUpdates


async def mutual_nda_turn(request: MutualNdaChatRequest) -> MrLegalTurn:
    """Send the conversation to the model and return its structured reply."""
    current_json = request.current_fields.model_dump_json(by_alias=True, exclude_none=True)
    response = await litellm.acompletion(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT + current_json},
            *(message.model_dump() for message in request.messages),
        ],
        response_format=MrLegalTurn,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return MrLegalTurn.model_validate_json(response.choices[0].message.content)


@router.post("/mutual-nda")
async def chat_mutual_nda(request: MutualNdaChatRequest) -> MrLegalTurn:
    """Chat with Mr. Legal about the Mutual NDA."""
    return await mutual_nda_turn(request)
