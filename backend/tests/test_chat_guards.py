from prelegal_backend.chat import clean_text, clean_value, document_updates
from prelegal_backend.documents import DOCUMENTS_BY_ID, DocumentField

NDA = DOCUMENTS_BY_ID["Mutual-NDA"]
GOVERNING_LAW = DocumentField(key="governingLaw", label="Governing law", hint="")
TERM_YEARS = DocumentField(key="mndaTermYears", label="Term", hint="")
DATE = DocumentField(key="effectiveDate", label="Effective date", hint="")
TERM_TYPE = DocumentField(key="mndaTermType", label="Term", hint="", options=["expires", "continues"])


def test_clean_text_drops_invisible_and_non_breaking_space_noise() -> None:
    assert clean_text("Delaware  ?") is None
    assert clean_text("Eval​uating") is None
    assert clean_text("Acme Ltd") == "Acme Ltd"
    assert clean_text("Muller GmbH, Munchen") == "Muller GmbH, Munchen"


def test_clean_value_strips_and_rejects_empty() -> None:
    assert clean_value(GOVERNING_LAW, "  Delaware  ") == "Delaware"
    assert clean_value(GOVERNING_LAW, "   ") is None


def test_clean_value_keeps_only_whole_numbers_of_years() -> None:
    assert clean_value(TERM_YEARS, "2") == "2"
    assert clean_value(TERM_YEARS, "10") == "10"
    assert clean_value(TERM_YEARS, "user") is None
    assert clean_value(TERM_YEARS, "0") is None
    assert clean_value(TERM_YEARS, "2 years") is None


def test_clean_value_keeps_only_iso_dates() -> None:
    assert clean_value(DATE, "2026-10-11") == "2026-10-11"
    assert clean_value(DATE, "11/10/2026") is None


def test_clean_value_keeps_only_allowed_options() -> None:
    assert clean_value(TERM_TYPE, "expires") == "expires"
    assert clean_value(TERM_TYPE, "forever") is None


def test_document_updates_drops_unknown_and_invalid_values() -> None:
    updates = document_updates(
        NDA,
        {
            "governingLaw": "Delaware ?",
            "mndaTermYears": "user",
            "mndaTermType": "expires",
            "effectiveDate": "2026-10-11",
            "purpose": "  Evaluating a partnership.  ",
            "notAField": "x",
            "party1Name": None,
        },
    )

    assert updates == {
        "mndaTermType": "expires",
        "effectiveDate": "2026-10-11",
        "purpose": "Evaluating a partnership.",
    }
