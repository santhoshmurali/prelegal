from prelegal_backend.chat import NdaFieldUpdates, clean_text, valid_date, valid_years


def test_clean_text_drops_invisible_and_non_breaking_space_noise() -> None:
    assert clean_text("Delaware  ?") is None
    assert clean_text("Eval​uating") is None
    assert clean_text("Acme Ltd") == "Acme Ltd"
    assert clean_text("Muller GmbH, Munchen") == "Muller GmbH, Munchen"


def test_valid_years_keeps_only_whole_numbers_of_years() -> None:
    assert valid_years("2") == "2"
    assert valid_years("10") == "10"
    assert valid_years("user") is None
    assert valid_years("0") is None
    assert valid_years("2 years") is None


def test_valid_date_keeps_only_iso_dates() -> None:
    assert valid_date("2026-10-11") == "2026-10-11"
    assert valid_date("11/10/2026") is None


def test_bad_values_are_dropped_and_good_values_kept() -> None:
    updates = NdaFieldUpdates.model_validate(
        {
            "governingLaw": "Delaware ?",
            "mndaTermYears": "user",
            "mndaTermType": "expires",
            "effectiveDate": "2026-10-11",
            "purpose": "  Evaluating a partnership.  ",
        }
    )

    assert updates.governing_law is None
    assert updates.mnda_term_years is None
    assert updates.mnda_term_type == "expires"
    assert updates.effective_date == "2026-10-11"
    assert updates.purpose == "Evaluating a partnership."
