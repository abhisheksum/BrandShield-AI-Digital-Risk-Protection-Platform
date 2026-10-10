import pytest
from app.core.normalization import normalize_text, extract_tokens

def test_normalization_basic():
    assert normalize_text("BrandShield") == "brandshield"
    assert normalize_text("  BRAND   SHIELD  ") == "brand shield"

def test_unicode_and_homoglyphs():
    # Cyrillic 'а' and 'е' substitution
    cyrillic_apex = "Apеx"  # 'е' is Cyrillic \u0435
    assert normalize_text(cyrillic_apex) == "apex"
    
    # Numbers and symbols as homoglyphs
    assert normalize_text("Br@nd$hield") == "brandshield"
    assert normalize_text("P4yp4l") == "paypal"
    assert normalize_text("G00gle") == "google"

def test_zero_width_characters():
    zero_width = "Apex\u200BPay"
    assert normalize_text(zero_width) == "apexpay"

def test_extract_tokens():
    tokens = extract_tokens("ApexPay Official Support Desk - 24/7!")
    assert "apexpay" in tokens
    assert "official" in tokens
    assert "support" in tokens
    assert "desk" in tokens
