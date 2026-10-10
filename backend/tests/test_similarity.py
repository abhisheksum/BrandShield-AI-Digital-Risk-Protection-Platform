import pytest
from app.core.string_similarity import compute_string_similarity

def test_exact_match():
    res = compute_string_similarity("ApexPay", "ApexPay")
    assert res["score"] == 100.0

def test_homoglyph_similarity():
    # Cyrillic 'е' vs Latin 'e'
    res = compute_string_similarity("ApexPay", "ApеxPay")
    assert res["score"] == 100.0

def test_typosquatting_detection():
    # Transposition or single edit
    res = compute_string_similarity("ApexPay", "ApexPayy")
    assert res["score"] >= 80.0
    assert "typosquatting" in res["explanation"].lower() or "similarity" in res["explanation"].lower()

def test_combosquatting_detection():
    # Appended keywords
    res = compute_string_similarity("ApexPay", "ApexPay Official Support Desk")
    assert res["score"] >= 70.0
    assert "target brand name" in res["explanation"].lower()

def test_dissimilar_string():
    res = compute_string_similarity("ApexPay", "Random unrelated company")
    assert res["score"] < 40.0
