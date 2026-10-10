import pytest
from app.core.scoring import calculate_explainable_risk_score

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
        "logo_hash": "a1b2c3d4e5f60718:a1b2c3d4e5f60718", # exact logo mimicry
        "publisher_name": "Unknown Entity",
        "is_unverified_new_account": True
    }
    
    result = calculate_explainable_risk_score(brand, suspicious_candidate)
    assert result["score"] >= 70.0
    assert result["severity"] in ["high", "critical"]
    assert len(result["reasons"]) > 0
    assert result["signals"]["name_similarity"]["available"] is True
    assert result["signals"]["logo_similarity"]["available"] is True

def test_missing_signals_do_not_penalize():
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
