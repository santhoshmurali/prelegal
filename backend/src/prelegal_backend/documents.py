"""Registry of the supported legal documents and their fields, read from templates/documents.json."""

import json
import os
from pathlib import Path

from pydantic import BaseModel

DEFAULT_DOCUMENTS_PATH = Path("../templates/documents.json")


class DocumentField(BaseModel):
    key: str
    label: str
    hint: str
    options: list[str] | None = None


class Document(BaseModel):
    id: str
    name: str
    description: str
    template: str
    fields: list[DocumentField]

    def field(self, key: str) -> DocumentField | None:
        """Return the field with this key, or None if the document has no such field."""
        return next((field for field in self.fields if field.key == key), None)


def documents_path() -> Path:
    """Return the registry path, overridable with DOCUMENTS_PATH."""
    return Path(os.environ.get("DOCUMENTS_PATH", DEFAULT_DOCUMENTS_PATH))


def load_documents(path: Path) -> list[Document]:
    """Parse the document registry."""
    return [Document.model_validate(entry) for entry in json.loads(path.read_text(encoding="utf-8"))]


DOCUMENTS = load_documents(documents_path())
DOCUMENTS_BY_ID = {document.id: document for document in DOCUMENTS}
