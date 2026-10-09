"""Temporary SQLite database, created from scratch when the file is missing."""

import os
from contextlib import closing
import sqlite3
from pathlib import Path

DEFAULT_DATABASE_PATH = Path("data/prelegal.db")

USERS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""


def database_path() -> Path:
    """Return the SQLite file path, overridable with DATABASE_PATH."""
    return Path(os.environ.get("DATABASE_PATH", DEFAULT_DATABASE_PATH))


def init_database(path: Path) -> None:
    """Create the database file and its tables if they do not exist."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path)) as connection, connection:
        connection.execute(USERS_TABLE_SQL)
