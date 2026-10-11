"""Admin user management: list accounts and activate or deactivate them."""

from contextlib import closing
from typing import Annotated
import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from prelegal_backend.auth import CurrentUser, SessionUser
from prelegal_backend.db import connect

router = APIRouter(prefix="/api/admin", tags=["admin"])


class Account(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    username: str
    is_admin: bool
    is_active: bool
    created_at: str


class ActiveUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    is_active: bool


def require_admin(user: CurrentUser) -> SessionUser:
    """Dependency that allows only the admin account through."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the admin can manage users.")
    return user


AdminUser = Annotated[SessionUser, Depends(require_admin)]


def to_account(row: sqlite3.Row) -> Account:
    """Build the account shown on the admin page from a users row."""
    return Account(
        id=row["id"],
        username=row["username"],
        is_admin=bool(row["is_admin"]),
        is_active=bool(row["is_active"]),
        created_at=row["created_at"],
    )


@router.get("/users")
def list_users(_admin: AdminUser) -> list[Account]:
    """Return every account, oldest first."""
    with closing(connect()) as connection:
        rows = connection.execute("SELECT * FROM users ORDER BY id").fetchall()
    return [to_account(row) for row in rows]


@router.patch("/users/{user_id}")
def set_user_active(user_id: int, update: ActiveUpdate, admin: AdminUser) -> Account:
    """Activate or deactivate an account. Deactivated users lose their sessions at once."""
    if user_id == admin.id and not update.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    with closing(connect()) as connection, connection:
        connection.execute("UPDATE users SET is_active = ? WHERE id = ?", (int(update.is_active), user_id))
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="No such user.")
    return to_account(row)
