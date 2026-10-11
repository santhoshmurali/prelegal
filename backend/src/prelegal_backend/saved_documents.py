"""Saved drafts: each signed-in user creates, lists, reopens and updates their own documents."""

from contextlib import closing
from datetime import UTC, datetime
import json
import sqlite3

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from prelegal_backend.auth import CurrentUser
from prelegal_backend.chat import DocumentId, document_updates
from prelegal_backend.db import connect
from prelegal_backend.documents import DOCUMENTS_BY_ID

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DraftIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, str_strip_whitespace=True)

    document_id: DocumentId
    title: str = Field(min_length=1, max_length=200)
    values: dict[str, str]


class DraftSummary(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    document_id: str
    title: str
    updated_at: str


class Draft(DraftSummary):
    values: dict[str, str]


def to_draft(row: sqlite3.Row) -> Draft:
    """Build a saved draft, including its field values, from a documents row."""
    return Draft(
        id=row["id"],
        document_id=row["document_id"],
        title=row["title"],
        updated_at=row["updated_at"],
        values=json.loads(row["values_json"]),
    )


def owned_row(connection: sqlite3.Connection, draft_id: int, owner_id: int) -> sqlite3.Row:
    """Return a draft only when it belongs to the user; other users get 404."""
    row = connection.execute(
        "SELECT * FROM documents WHERE id = ? AND owner_id = ?", (draft_id, owner_id)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="No such document.")
    return row


@router.get("")
def list_drafts(user: CurrentUser) -> list[DraftSummary]:
    """Return the user's drafts, most recently updated first."""
    with closing(connect()) as connection:
        rows = connection.execute(
            "SELECT id, document_id, title, updated_at FROM documents WHERE owner_id = ? "
            "ORDER BY updated_at DESC, id DESC",
            (user.id,),
        ).fetchall()
    return [
        DraftSummary(id=row["id"], document_id=row["document_id"], title=row["title"], updated_at=row["updated_at"])
        for row in rows
    ]


@router.post("", status_code=201)
def create_draft(draft: DraftIn, user: CurrentUser) -> Draft:
    """Save a new draft. Only the registry's known fields with valid values are kept."""
    now = datetime.now(UTC).isoformat()
    values = document_updates(DOCUMENTS_BY_ID[draft.document_id], draft.values)
    with closing(connect()) as connection, connection:
        cursor = connection.execute(
            "INSERT INTO documents (owner_id, document_id, title, values_json, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (user.id, draft.document_id, draft.title, json.dumps(values), now, now),
        )
        row = owned_row(connection, cursor.lastrowid, user.id)
    return to_draft(row)


@router.get("/{draft_id}")
def get_draft(draft_id: int, user: CurrentUser) -> Draft:
    """Return one of the user's drafts with its field values."""
    with closing(connect()) as connection:
        return to_draft(owned_row(connection, draft_id, user.id))


@router.put("/{draft_id}")
def update_draft(draft_id: int, draft: DraftIn, user: CurrentUser) -> Draft:
    """Overwrite a draft's title and field values, and set its updated time."""
    now = datetime.now(UTC).isoformat()
    values = document_updates(DOCUMENTS_BY_ID[draft.document_id], draft.values)
    with closing(connect()) as connection, connection:
        owned_row(connection, draft_id, user.id)
        connection.execute(
            "UPDATE documents SET document_id = ?, title = ?, values_json = ?, updated_at = ? WHERE id = ?",
            (draft.document_id, draft.title, json.dumps(values), now, draft_id),
        )
        row = owned_row(connection, draft_id, user.id)
    return to_draft(row)
