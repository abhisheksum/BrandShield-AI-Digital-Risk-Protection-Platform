from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz
from app.config import settings
from app.core.normalization import normalize_text
from app.core.string_similarity import compute_string_similarity
from app.core.image_similarity import compare_hashes

def calculate_explainable_risk_score(
    brand_data: Dict[str, Any],
    candidate_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculates explainable risk score (0 to 100) using configurable weights:
    - Name similarity: 30%
    - Logo similarity: 25%
    - Description & branding similarity: 20%
    - Publisher or account mismatch: 15%
    - Suspicious behavior indicators: 10%

    Rules:
    - Explicitly track unavailable signals.
    - Do NOT penalize missing signals as malicious. When a signal is unavailable,
      redistribute active weights dynamically across available signals.
    - Produce detailed structured explanations.
    """
    weights = {
        "name_similarity": settings.WEIGHT_NAME_SIMILARITY,
        "logo_similarity": settings.WEIGHT_LOGO_SIMILARITY,
        "description_similarity": settings.WEIGHT_DESCRIPTION_SIMILARITY,
        "publisher_mismatch": settings.WEIGHT_PUBLISHER_MISMATCH,
        "suspicious_indicators": settings.WEIGHT_SUSPICIOUS_BEHAVIOR,
    }

    signal_scores: Dict[str, Optional[float]] = {}
    signal_explanations: Dict[str, str] = {}
    missing_signals: List[str] = []
    reasons: List[str] = []

    # 1. Name Similarity (30%)
    brand_name = brand_data.get("name", "")
    cand_name = candidate_data.get("candidate_name") or candidate_data.get("name", "")
    name_res = compute_string_similarity(brand_name, cand_name)
    signal_scores["name_similarity"] = name_res["score"]
    signal_explanations["name_similarity"] = name_res["explanation"]
    if name_res["score"] >= 80:
        reasons.append(f"High name resemblance ({name_res['score']}%): {name_res['explanation']}")

    # 2. Logo Similarity (25%)
    brand_logo_hash = brand_data.get("logo_hash")
    cand_logo_hash = candidate_data.get("logo_hash")
    if brand_logo_hash and cand_logo_hash:
        logo_res = compare_hashes(brand_logo_hash, cand_logo_hash)
        if logo_res.get("available") and logo_res.get("similarity") is not None:
            signal_scores["logo_similarity"] = logo_res["similarity"]
            signal_explanations["logo_similarity"] = logo_res["explanation"]
            if logo_res["similarity"] >= 75:
                reasons.append(f"Logo visual mimicry detected ({logo_res['similarity']}%): {logo_res['explanation']}")
        else:
            signal_scores["logo_similarity"] = None
            signal_explanations["logo_similarity"] = "Logo comparison unavailable or format unsupported"
            missing_signals.append("logo_similarity")
    else:
        signal_scores["logo_similarity"] = None
        signal_explanations["logo_similarity"] = "Candidate or brand logo not provided for comparison"
        missing_signals.append("logo_similarity")

    # 3. Description & Branding Similarity (20%)
    brand_desc = brand_data.get("description", "")
    cand_desc = candidate_data.get("description", "")
    if brand_desc and cand_desc:
        norm_bd = normalize_text(brand_desc)
        norm_cd = normalize_text(cand_desc)
        desc_ratio = fuzz.token_set_ratio(norm_bd, norm_cd)
        signal_scores["description_similarity"] = round(desc_ratio, 2)
        signal_explanations["description_similarity"] = f"Textual branding overlap of {desc_ratio}% in bio/description"
        if desc_ratio >= 70:
            reasons.append(f"Substantial overlap in public description/bio ({desc_ratio}%)")
    else:
        signal_scores["description_similarity"] = None
        signal_explanations["description_similarity"] = "Description text unavailable for comparison"
        missing_signals.append("description_similarity")

    # 4. Publisher / Account Mismatch (15%)
    # If the candidate looks like the brand but is published by an unknown / third-party publisher
    brand_pub = brand_data.get("official_publisher") or brand_name
    cand_pub = candidate_data.get("publisher_name") or candidate_data.get("publisher")
    cand_type = candidate_data.get("candidate_type", "social_account")

    if cand_pub:
        pub_norm_b = normalize_text(brand_pub)
        pub_norm_c = normalize_text(cand_pub)
        pub_sim = fuzz.ratio(pub_norm_b, pub_norm_c)
        if pub_sim < 40 and signal_scores["name_similarity"] >= 65:
            # High risk: High name similarity to brand, but publisher is completely different entity
            signal_scores["publisher_mismatch"] = 90.0
            signal_explanations["publisher_mismatch"] = f"Unverified publisher '{cand_pub}' does not match official entity '{brand_pub}'"
            reasons.append(f"Publisher mismatch: published by '{cand_pub}' instead of verified entity")
        elif pub_sim < 40:
            signal_scores["publisher_mismatch"] = 40.0
            signal_explanations["publisher_mismatch"] = f"Publisher '{cand_pub}' is distinct"
        else:
            signal_scores["publisher_mismatch"] = 10.0
            signal_explanations["publisher_mismatch"] = f"Publisher resembles registered brand entity"
    else:
        if cand_type == "mobile_app":
            signal_scores["publisher_mismatch"] = 50.0
            signal_explanations["publisher_mismatch"] = "Mobile app publisher information is omitted/unlisted"
            reasons.append("Missing publisher details for mobile application")
        else:
            signal_scores["publisher_mismatch"] = None
            signal_explanations["publisher_mismatch"] = "Publisher signal not applicable for this candidate type"
            missing_signals.append("publisher_mismatch")

    # 5. Suspicious Behavior Indicators (10%)
    indicators_score = 0.0
    indicator_notes = []
    
    # Check for known risk keywords in candidate handle/URL/name
    suspicious_keywords = ["official", "support", "helpdesk", "verify", "secure", "login", "claim", "reward", "crypto", "free", "admin"]
    cand_full_text = f"{cand_name} {candidate_data.get('candidate_identifier', '')} {cand_desc}".lower()
    
    matched_kw = [kw for kw in suspicious_keywords if kw in cand_full_text]
    if matched_kw:
        indicators_score += min(60.0, len(matched_kw) * 20.0)
        indicator_notes.append(f"Contains high-risk trigger keywords: {', '.join(matched_kw)}")

    # Check for external unverified download/contact links
    if "t.me/" in cand_full_text or "bit.ly/" in cand_full_text or "whatsapp" in cand_full_text or ".apk" in cand_full_text:
        indicators_score += 35.0
        indicator_notes.append("Directs users to external off-platform redirection or untrusted download links")

    # Recent account creation or zero verification if flagged
    if candidate_data.get("is_unverified_new_account"):
        indicators_score += 25.0
        indicator_notes.append("New unverified profile created recently mimicking established brand")

    indicators_score = min(100.0, indicators_score)
    signal_scores["suspicious_indicators"] = indicators_score
    signal_explanations["suspicious_indicators"] = "; ".join(indicator_notes) if indicator_notes else "No immediate behavioral anomalies flagged"
    if indicator_notes:
        reasons.extend(indicator_notes)

    # DYNAMIC WEIGHT REDISTRIBUTION FOR MISSING SIGNALS
    # Sum the configured weights of all available signals
    available_weight_sum = sum(
        weights[sig] for sig, val in signal_scores.items() if val is not None
    )

    if available_weight_sum > 0:
        total_risk_score = 0.0
        signal_contributions = {}
        for sig, val in signal_scores.items():
            if val is not None:
                # Normalized weight relative to available evidence
                effective_weight = weights[sig] / available_weight_sum
                contribution = val * effective_weight
                total_risk_score += contribution
                signal_contributions[sig] = round(contribution, 2)
            else:
                signal_contributions[sig] = 0.0
    else:
        total_risk_score = 0.0
        signal_contributions = {sig: 0.0 for sig in weights}

    final_score = round(min(100.0, max(0.0, total_risk_score)), 1)

    # Determine Severity
    if final_score >= settings.CRITICAL_RISK_THRESHOLD:
        severity = "critical"
    elif final_score >= settings.HIGH_RISK_THRESHOLD:
        severity = "high"
    elif final_score >= settings.MEDIUM_RISK_THRESHOLD:
        severity = "medium"
    else:
        severity = "low"

    # Construct structured evidence explanation
    structured_evidence = {
        "score": final_score,
        "severity": severity,
        "signals": {
            sig: {
                "configured_weight": weights[sig],
                "effective_contribution": signal_contributions.get(sig, 0.0),
                "raw_score": signal_scores.get(sig),
                "available": signal_scores.get(sig) is not None,
                "explanation": signal_explanations.get(sig, "")
            }
            for sig in weights
        },
        "missing_signals": missing_signals,
        "reasons": reasons if reasons else ["General low-confidence similarity across signals"],
        "summary": f"Calculated risk score of {final_score}/100 ({severity.upper()}) based on {len(weights) - len(missing_signals)} available signal dimensions."
    }

    return structured_evidence
