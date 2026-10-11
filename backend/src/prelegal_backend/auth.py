"""Accounts and sessions: scrypt password hashes and opaque session tokens in an HttpOnly cookie."""

from contextlib import closing
from typing import Annotated
import hashlib
import hmac
import os
import secrets
import sqlite3

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from prelegal_backend.db import connect

SESSION_COOKIE = "prelegal_session"
SALT_BYTES = 16
KEY_BYTES = 64
SCRYPT_PARAMS = {"n": 2**14, "r": 8, "p": 1}

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class SessionUser(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    username: str
    is_admin: bool


SessionToken = Annotated[str | None, Cookie(alias=SESSION_COOKIE)]


def _scrypt(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, dklen=KEY_BYTES, **SCRYPT_PARAMS)


def hash_password(password: str) -> str:
    """Return a salted scrypt hash stored as salt$key, both hex encoded."""
    salt = os.urandom(SALT_BYTES)
    return f"{salt.hex()}${_scrypt(password, salt).hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Check a password against a hash made by hash_password."""
    salt_hex, key_hex = stored_hash.split("$")
    return hmac.compare_digest(_scrypt(password, bytes.fromhex(salt_hex)), bytes.fromhex(key_hex))


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def user_count() -> int:
    """Return how many accounts exist."""
    with closing(connect()) as connection:
        return connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]


def insert_user(username: str, password: str, is_admin: bool = False) -> None:
    """Store a new account with a hashed password."""
    with closing(connect()) as connection, connection:
        connection.execute(
            "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
            (username, hash_password(password), int(is_admin)),
        )


def find_user(username: str) -> sqlite3.Row | None:
    """Return the account row for a username, if it exists."""
    with closing(connect()) as connection:
        return connection.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()


def seed_admin_if_empty() -> None:
    """Create the one-time admin from SEED_USERNAME and SEED_PASSWORD when no accounts exist."""
    username = os.environ.get("SEED_USERNAME")
    password = os.environ.get("SEED_PASSWORD")
    if not (username and password) or user_count() > 0:
        return
    insert_user(username, password, is_admin=True)


def create_session(user_id: int) -> str:
    """Start a session for a user and return the token to send in the cookie."""
    token = secrets.token_urlsafe(32)
    with closing(connect()) as connection, connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id) VALUES (?, ?)",
            (_token_hash(token), user_id),
        )
    return token


def delete_session(token: str) -> None:
    """End a session by its token."""
    with closing(connect()) as connection, connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))


def session_user(token: str) -> SessionUser | None:
    """Return the signed-in user for a token; deactivated accounts lose access at once."""
    with closing(connect()) as connection:
        row = connection.execute(
            "SELECT u.id, u.username, u.is_admin, u.is_active FROM sessions s "
            "JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?",
            (_token_hash(token),),
        ).fetchone()
    if row is None or not row["is_active"]:
        return None
    return SessionUser(id=row["id"], username=row["username"], is_admin=bool(row["is_admin"]))


def current_user(session_token: SessionToken = None) -> SessionUser:
    """Dependency that requires a valid session cookie."""
    user = session_user(session_token) if session_token else None
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return user


CurrentUser = Annotated[SessionUser, Depends(current_user)]


@router.post("/login")
def login(credentials: LoginRequest, response: Response) -> SessionUser:
    """Check credentials and set the session cookie."""
    user = find_user(credentials.username)
    if user is None or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="This account has been deactivated.")
    response.set_cookie(SESSION_COOKIE, create_session(user["id"]), httponly=True, samesite="lax")
    return SessionUser(id=user["id"], username=user["username"], is_admin=bool(user["is_admin"]))


@router.post("/logout", status_code=204)
def logout(response: Response, session_token: SessionToken = None) -> None:
    """End the session and clear the cookie."""
    if session_token:
        delete_session(session_token)
    response.delete_cookie(SESSION_COOKIE)


@router.get("/me")
def me(user: CurrentUser) -> SessionUser:
    """Return the signed-in user, or 401 when signed out."""
    return user
