import json
from pathlib import Path

from prelegal_backend.documents import DOCUMENTS, DOCUMENTS_BY_ID, DocumentField, documents_path

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES = ROOT / "templates"
CATALOG_NDA_COVER_PAGE = "Mutual-NDA-coverpage.md"


def test_registry_has_eleven_documents_with_the_nda_first() -> None:
    assert len(DOCUMENTS) == 11
    assert DOCUMENTS[0].id == "Mutual-NDA"


def test_every_document_template_exists() -> None:
    assert all((TEMPLATES / document.template).is_file() for document in DOCUMENTS)


def test_registry_matches_catalog_filenames() -> None:
    catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
    catalog_files = {entry["filename"] for entry in catalog}
    registry_files = {document.template for document in DOCUMENTS} | {CATALOG_NDA_COVER_PAGE}

    assert catalog_files == registry_files


def test_field_keys_are_unique_within_each_document() -> None:
    for document in DOCUMENTS:
        keys = [field.key for field in document.fields]
        assert len(keys) == len(set(keys)), document.id


def test_only_fixed_choice_fields_have_options() -> None:
    options = {
        (document.id, field.key)
        for document in DOCUMENTS
        for field in document.fields
        if field.options
    }

    assert options == {
        ("Mutual-NDA", "mndaTermType"),
        ("Mutual-NDA", "confidentialityType"),
    }


def test_documents_path_defaults_to_the_repository_templates() -> None:
    assert documents_path().name == "documents.json"
    assert DOCUMENTS_BY_ID["Mutual-NDA"].field("governingLaw") == DocumentField(
        key="governingLaw", label="Governing law (state)", hint="e.g. Delaware"
    )
