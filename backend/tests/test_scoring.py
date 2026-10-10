import pytest
from app.core.scoring import calculate_explainable_risk_score
from app.config import settings

def test_explainable_risk_score_high_risk():
    brand = {
        "name": "ApexPay",
        "description": "Next-generation digital payments and global money transfer network.",
        "logo_hash": "a1b2c3d4e5f60718:a1b2c3d4e5f60718",
        "official_publisher": "ApexPay Technologies Inc."
    }
    
    suspicious_candidate = {
        "candidate_name": "ApexPay Official Support",
        "candidate_identifier": "@apexpay_support_desk",
        "candidate_type": "social_account",
        "description": "Urgent official helpdesk. Claim rewards now bit.ly/apex-verify",
        "logo_hash": "a1b2c3d4e5f60718:a1b2c3d4e5f60718",  # exact logo mimicry
        "publisher_name": "Unknown Entity",
        "is_unverified_new_account": True
    }
    
    result = calculate_explainable_risk_score(brand, suspicious_candidate)
    assert result["score"] >= 70.0
    assert result["severity"] in ["high", "critical"]
    assert len(result["reasons"]) > 0
    assert result["confidence"] in ["high", "medium"]
    assert result["recommended_action"] is not None
    assert "disclaimer" in result
    assert result["signals"]["name_similarity"]["available"] is True
    assert result["signals"]["logo_similarity"]["available"] is True

def test_missing_signals_do_not_penalize_and_lower_confidence():
    brand = {
        "name": "ApexPay",
        "description": "",
        "logo_hash": None,
        "official_publisher": "ApexPay Inc."
    }
    
    # Candidate with only name available
    candidate = {
        "candidate_name": "ApexPay Community",
        "candidate_type": "social_account",
        "description": "",
        "logo_hash": None,
        "publisher_name": None
    }
    
    result = calculate_explainable_risk_score(brand, candidate)
    # Missing signals should be explicitly tracked
    assert "logo_similarity" in result["missing_signals"]
    assert "description_similarity" in result["missing_signals"]
    # Score should still be computable without throwing errors
    assert 0.0 <= result["score"] <= 100.0
    # Missing signals must lower confidence
    assert result["confidence"] in ["medium", "low"]
    assert result["coverage_ratio"] < 0.85

def test_name_similarity_alone_cannot_produce_critical_verdict():
    """
    CRITICAL REQUIREMENT:
    Name similarity alone cannot produce a critical verdict (score >= 80).
    Even with 100% exact name match and all missing signals reallocated to name,
    score must be strictly capped at 74.0 (HIGH maximum) without corroborating evidence.
    """
    brand = {
        "name": "ApexPay",
        "description": "",
        "logo_hash": None,
        "official_publisher": ""
    }
    
    # Exact name match, but zero secondary evidence, no logo, no description, no scam words
    candidate = {
        "candidate_name": "ApexPay",
        "candidate_identifier": "@apexpay",
        "candidate_type": "social_account",
        "description": "",
        "logo_hash": None,
        "publisher_name": None,
        "is_unverified_new_account": False
    }
    
    result = calculate_explainable_risk_score(brand, candidate)
    # Even if name similarity is 100%, verdict CANNOT be critical (CRITICAL threshold is >= 80)
    assert result["score"] < settings.CRITICAL_RISK_THRESHOLD
    assert result["severity"] != "critical"

def test_corroborated_signals_produce_critical_verdict():
    """
    When name similarity is backed by logo mimicry, identity conflict, or scam triggers,
    the verdict can reach critical.
    """
    brand = {
        "name": "ApexPay",
        "description": "Enterprise payment gateway",
        "logo_hash": "1111222233334444:5555666677778888",
        "official_publisher": "ApexPay Inc."
    }
    
    candidate = {
        "candidate_name": "ApexPay Support Helpdesk",
        "candidate_identifier": "@apexpay_help",
        "candidate_type": "social_account",
        "description": "Official support. Send direct message or visit bit.ly/apex-claim to recover funds",
        "logo_hash": "1111222233334444:5555666677778888",  # Identical logo
        "publisher_name": "Rogue Operator LLC",
        "is_unverified_new_account": True
    }
    
    result = calculate_explainable_risk_score(brand, candidate)
    assert result["score"] >= 80.0
    assert result["severity"] == "critical"
    assert result["confidence"] == "high"
    assert "immediate" in result["recommended_action"].lower()

def test_custom_configurable_weights():
    brand = {"name": "TestBrand"}
    cand = {"candidate_name": "TestBrand Fake", "candidate_identifier": "@fake"}
    
    # Custom weights
    custom_w = {
        "name_similarity": 0.50,
        "logo_similarity": 0.10,
        "description_similarity": 0.10,
        "publisher_mismatch": 0.15,
        "suspicious_indicators": 0.15
    }
    result = calculate_explainable_risk_score(brand, cand, custom_weights=custom_w)
    assert result["score"] >= 0.0
