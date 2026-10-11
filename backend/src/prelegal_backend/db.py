"""Temporary SQLite database, created from scratch when the file is missing."""

from contextlib import closing
import os
from pathlib import Path
import sqlite3

DEFAULT_DATABASE_PATH = Path("data/prelegal.db")

USERS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

SESSIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
)
"""


def database_path() -> Path:
    """Return the SQLite file path, overridable with DATABASE_PATH."""
    return Path(os.environ.get("DATABASE_PATH", DEFAULT_DATABASE_PATH))


def connect() -> sqlite3.Connection:
    """Open a connection to the database whose rows can be read by column name."""
    connection = sqlite3.connect(database_path())
    connection.row_factory = sqlite3.Row
    return connection


def init_database(path: Path) -> None:
    """Create the database file and its tables if they do not exist."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path)) as connection, connection:
        connection.execute(USERS_TABLE_SQL)
        connection.execute(SESSIONS_TABLE_SQL)
