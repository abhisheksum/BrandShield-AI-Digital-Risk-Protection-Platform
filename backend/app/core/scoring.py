from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz
from app.config import settings
from app.core.normalization import normalize_text
from app.core.string_similarity import compute_string_similarity, COMMON_SUSPICIOUS_WORDS
from app.core.image_similarity import compare_hashes

"""
================================================================================
REDSHIELD UNIFIED THREAT SCORING ENGINE SPECIFICATION & FORMULA DOCUMENTATION
================================================================================

1. PHILOSOPHICAL FOUNDATION:
   This engine calculates a transparent, deterministic heuristic score (0 to 100),
   categorized into Critical, High, Medium, or Low severity levels.
   **CRITICAL PRINCIPLE**: A heuristic score is NEVER represented as a statistical
   or verified probability. It is an explainable composite risk indicator based
   on observable threat vectors and heuristic signal indicators.

2. MULTI-SIGNAL DECOMPOSITION & CONFIGURABLE WEIGHTS:
   The composite heuristic score incorporates 5 core threat signals:
   - Name & Handle similarity (W_name = 0.30)
   - Logo visual similarity (W_logo = 0.25)
   - Description & branding overlap (W_desc = 0.20)
   - Publisher / Identity Conflict (W_identity = 0.15)
   - Suspicious behavior & scam triggers (W_suspicious = 0.10)
   (Default weights sum to 1.00 and are configurable via application settings)

3. DYNAMIC WEIGHT REBALANCING & MISSING EVIDENCE HANDLING:
   When telemetry for any signal is unavailable (e.g., logo hash not provided,
   bio text omitted, publisher not listed), the engine dynamically rebalances
   the remaining available signal weights proportionally:
       W_norm(i) = W(i) / Sum_{k in Available}(W(k))
   Furthermore, missing evidence explicitly lowers the analyst CONFIDENCE level:
   - High Confidence: All or nearly all signals available (Available Weight >= 85%)
   - Medium Confidence: Core signals present, secondary missing (Available Weight 50-84%)
   - Low Confidence: Sparse evidence (Available Weight < 50%)

4. HARD SECURITY GUARDRAIL (NAME SIMILARITY CAP):
   "Name similarity alone cannot produce a critical verdict."
   If an entity has high name similarity (even 100% exact name match) but lacks
   substantiating secondary malicious indicators (such as visual logo mimicry,
   verified identity conflict, or active phishing keywords), the score is
   STRICTLY CAPPED at 74.0 (HIGH maximum), preventing false-positive critical alarms
   for mere naming overlaps or legitimate community discussions. A CRITICAL
   verdict (>= 80.0) strictly requires corroborated corroborating evidence.

5. SEPARATE CONFIDENCE LEVEL & RECOMMENDED ACTIONS:
   Output provides:
   - risk_score: float (0.0 to 100.0)
   - severity: "critical" | "high" | "medium" | "low"
   - confidence: "high" | "medium" | "low"
   - recommended_action: Context-aware guidance (e.g. Immediate Takedown, In-depth Investigation, Whitelist Review)
   - reasons: Evidence-based explanation items
================================================================================
"""

def determine_recommended_action(severity: str, confidence: str, has_identity_conflict: bool, has_scam_words: bool) -> str:
    if severity == "critical":
        if confidence == "high":
            return "Initiate immediate multi-channel takedown request and issue brand protection advisory."
        else:
            return "High priority: Confirm secondary evidence (whois/developer) and proceed with takedown."
    elif severity == "high":
        if has_scam_words or has_identity_conflict:
            return "Escalate to Tier-2 SOC Analyst for brand infringement verification and cease-and-desist review."
        else:
            return "Monitor profile telemetry and inspect candidate domain redirects."
    elif severity == "medium":
        return "Queue for periodic automated re-scan and monitor for escalation of activity."
    else:
        return "Log candidate and retain in passive threat observation index."

def calculate_explainable_risk_score(
    brand_data: Dict[str, Any],
    candidate_data: Dict[str, Any],
    custom_weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Unified Scoring Service:
    Computes explainable risk score (0-100), severity, separate confidence,
    evidence-based reasons, and recommended action.
    """
    # 1. Base Configurable Weights
    weights = {
        "name_similarity": settings.WEIGHT_NAME_SIMILARITY,
        "logo_similarity": settings.WEIGHT_LOGO_SIMILARITY,
        "description_similarity": settings.WEIGHT_DESCRIPTION_SIMILARITY,
        "publisher_mismatch": settings.WEIGHT_PUBLISHER_MISMATCH,
        "suspicious_indicators": settings.WEIGHT_SUSPICIOUS_BEHAVIOR,
    }
    if custom_weights:
        for k, v in custom_weights.items():
            if k in weights:
                weights[k] = v

    total_nominal_weight = sum(weights.values()) or 1.0

    signal_scores: Dict[str, Optional[float]] = {}
    signal_explanations: Dict[str, str] = {}
    signal_variations: Dict[str, Any] = {}
    missing_signals: List[str] = []
    reasons: List[str] = []

    # -------------------------------------------------------------------------
    # SIGNAL 1: Name & Handle Similarity (Configurable 30%)
    # -------------------------------------------------------------------------
    brand_name = brand_data.get("name", "")
    cand_name = candidate_data.get("candidate_name") or candidate_data.get("name", "")
    cand_handle = candidate_data.get("candidate_identifier") or ""

    name_res = compute_string_similarity(brand_name, cand_name)
    handle_res = compute_string_similarity(brand_name, cand_handle) if cand_handle else name_res

    if handle_res["score"] > name_res["score"]:
        chosen_sim = handle_res
        sim_source = "handle"
    else:
        chosen_sim = name_res
        sim_source = "display name"

    signal_scores["name_similarity"] = float(chosen_sim["score"])
    signal_explanations["name_similarity"] = f"Match via {sim_source}: {chosen_sim['explanation']}"
    signal_variations["name_similarity"] = chosen_sim.get("variations", {})

    if chosen_sim["score"] >= 75:
        reasons.append(f"Strong name/handle resemblance ({chosen_sim['score']}%): {chosen_sim['explanation']}")

    # -------------------------------------------------------------------------
    # SIGNAL 2: Logo Visual Similarity (Configurable 25%)
    # ---------------------------------------------------------
    brand_logo_hash = brand_data.get("logo_hash")
    cand_logo_hash = candidate_data.get("logo_hash")
    has_corroborating_logo = False

    if brand_logo_hash and cand_logo_hash:
        logo_res = compare_hashes(brand_logo_hash, cand_logo_hash)
        if logo_res.get("available") and logo_res.get("similarity") is not None:
            sim_val = float(logo_res["similarity"])
            signal_scores["logo_similarity"] = sim_val
            signal_explanations["logo_similarity"] = logo_res["explanation"]
            if sim_val >= 70:
                has_corroborating_logo = True
                reasons.append(f"Logo visual mimicry detected ({sim_val}% match): {logo_res['explanation']}")
        else:
            signal_scores["logo_similarity"] = None
            signal_explanations["logo_similarity"] = "Logo comparison unavailable or format unsupported"
            missing_signals.append("logo_similarity")
    else:
        signal_scores["logo_similarity"] = None
        signal_explanations["logo_similarity"] = "Candidate or brand logo visual hash not provided"
        missing_signals.append("logo_similarity")

    # -------------------------------------------------------------------------
    # SIGNAL 3: Description & Branding Overlap (Configurable 20%)
    # ---------------------------------------------------------
    brand_desc = brand_data.get("description", "")
    cand_desc = candidate_data.get("description", "")

    if brand_desc and cand_desc:
        norm_bd = normalize_text(brand_desc)
        norm_cd = normalize_text(cand_desc)
        desc_ratio = float(fuzz.token_set_ratio(norm_bd, norm_cd))
        signal_scores["description_similarity"] = round(desc_ratio, 1)
        signal_explanations["description_similarity"] = f"Branding overlap of {desc_ratio}% in bio/description text"
        if desc_ratio >= 65:
            reasons.append(f"Substantial overlap in public description/bio ({desc_ratio}%)")
    else:
        signal_scores["description_similarity"] = None
        signal_explanations["description_similarity"] = "Description text unavailable for linguistic comparison"
        missing_signals.append("description_similarity")

    # -------------------------------------------------------------------------
    # SIGNAL 4: Identity Conflict / Publisher Mismatch (Configurable 15%)
    # ---------------------------------------------------------
    # Only compare publishers against an explicitly registered app publisher.
    # The brand display name is not evidence of the legal app seller.
    brand_pub = brand_data.get("official_publisher")
    cand_pub = candidate_data.get("publisher_name") or candidate_data.get("publisher")
    cand_type = candidate_data.get("candidate_type", "social_account")
    has_identity_conflict = False

    if cand_pub and brand_pub:
        pub_norm_b = normalize_text(brand_pub)
        pub_norm_c = normalize_text(cand_pub)
        pub_sim = fuzz.ratio(pub_norm_b, pub_norm_c)
        if pub_sim < 40 and signal_scores["name_similarity"] >= 60:
            signal_scores["publisher_mismatch"] = 90.0
            signal_explanations["publisher_mismatch"] = f"Listed publisher '{cand_pub}' differs from registered official app publisher '{brand_pub}'"
            reasons.append(f"Publisher mismatch: candidate lists '{cand_pub}', while the registered app lists '{brand_pub}'")
            has_identity_conflict = True
        elif pub_sim < 40:
            signal_scores["publisher_mismatch"] = 40.0
            signal_explanations["publisher_mismatch"] = f"Listed publisher '{cand_pub}' differs from registered official app publisher '{brand_pub}'"
        else:
            signal_scores["publisher_mismatch"] = 10.0
            signal_explanations["publisher_mismatch"] = "Listed publisher matches the registered official app publisher"
    elif cand_pub:
        signal_scores["publisher_mismatch"] = None
        signal_explanations["publisher_mismatch"] = "Publisher is listed, but no official app publisher is registered for comparison"
        missing_signals.append("publisher_mismatch")
    else:
        if candidate_data.get("is_unverified_new_account"):
            signal_scores["publisher_mismatch"] = 75.0
            signal_explanations["publisher_mismatch"] = "Unverified profile with no official identity linkage"
            reasons.append("Unverified social account without verified corporate identity linkage")
            has_identity_conflict = True
        elif cand_type == "mobile_app":
            signal_scores["publisher_mismatch"] = None
            signal_explanations["publisher_mismatch"] = "Mobile app publisher information is omitted/unlisted"
            missing_signals.append("publisher_mismatch")
        else:
            signal_scores["publisher_mismatch"] = None
            signal_explanations["publisher_mismatch"] = "Publisher identity signal not applicable"
            missing_signals.append("publisher_mismatch")

    # -------------------------------------------------------------------------
    # SIGNAL 5: Suspicious Behavioral & Scam Indicators (Configurable 10%)
    # ---------------------------------------------------------
    indicators_score = 0.0
    indicator_notes = []
    has_scam_words = False

    cand_text_blob = f"{cand_name} {cand_handle} {cand_desc} {candidate_data.get('candidate_url', '')}".lower()

    detected_words = [kw for kw in COMMON_SUSPICIOUS_WORDS if kw in cand_text_blob]
    if detected_words:
        added_pts = min(60.0, len(detected_words) * 20.0)
        indicators_score += added_pts
        indicator_notes.append(f"Scam keywords present: {', '.join(detected_words[:5])}")
        reasons.append(f"Contains scam/impersonation trigger words: {', '.join(detected_words[:4])}")
        has_scam_words = True

    external_scam_domains = ["t.me/", "bit.ly/", "tinyurl.com/", "wa.me/", "linktr.ee/", "forms.gle/", "t.co/", "goo.su/", "is.gd/"]
    found_links = [link for link in external_scam_domains if link in cand_text_blob]
    if found_links:
        indicators_score += 40.0
        indicator_notes.append(f"Unsanctioned off-platform link: {', '.join(found_links)}")
        reasons.append(f"Directs users to off-platform redirection links: {', '.join(found_links)}")
        has_scam_words = True

    if candidate_data.get("is_unverified_new_account") and cand_type == "social_account":
        indicators_score += 20.0
        indicator_notes.append("Newly registered unverified account")

    indicators_score = min(100.0, indicators_score)
    signal_scores["suspicious_indicators"] = indicators_score
    signal_explanations["suspicious_indicators"] = "; ".join(indicator_notes) if indicator_notes else "No immediate behavioral scam flags"

    # -------------------------------------------------------------------------
    # DYNAMIC WEIGHT REBALANCING & COMPOSITE SCORING
    # -------------------------------------------------------------------------
    available_weights = {k: v for k, v in weights.items() if signal_scores[k] is not None}
    sum_avail = sum(available_weights.values())

    if sum_avail > 0:
        normalized_weights = {k: v / sum_avail for k, v in available_weights.items()}
    else:
        normalized_weights = {}

    composite_score = 0.0
    signal_breakdowns = {}

    for k in weights.keys():
        score_val = signal_scores[k]
        if score_val is not None and sum_avail > 0:
            active_weight = normalized_weights[k]
            contribution = round(score_val * active_weight, 2)
            composite_score += contribution
            signal_breakdowns[k] = {
                "weight": round(active_weight, 3),
                "raw_similarity": round(score_val, 1),
                "contribution": contribution,
                "available": True,
                "explanation": signal_explanations[k]
            }
        else:
            signal_breakdowns[k] = {
                "weight": 0.0,
                "raw_similarity": None,
                "contribution": 0.0,
                "available": False,
                "explanation": signal_explanations[k]
            }

    raw_final_score = round(min(100.0, max(0.0, composite_score)), 1)

    # -------------------------------------------------------------------------
    # CONFIDENCE LEVEL EVALUATION:
    # Missing evidence directly lowers analyst confidence level
    # -------------------------------------------------------------------------
    evidence_coverage_ratio = sum_avail / total_nominal_weight
    if evidence_coverage_ratio >= 0.85:
        confidence = "high"
    elif evidence_coverage_ratio >= 0.50:
        confidence = "medium"
    else:
        confidence = "low"

    # -------------------------------------------------------------------------
    # HARD REQUIREMENT GUARDRAIL:
    # "Name similarity alone cannot produce a critical verdict."
    # If the only driver is name resemblance without corroborating evidence
    # (logo mimicry, identity conflict, or active phishing keywords), cap at 74.0 (High).
    # -------------------------------------------------------------------------
    has_corroborating_evidence = (
        has_corroborating_logo or 
        has_identity_conflict or 
        has_scam_words or 
        (signal_scores.get("description_similarity") is not None and signal_scores["description_similarity"] >= 70.0)
    )

    is_name_only = not has_corroborating_evidence

    if is_name_only and raw_final_score >= settings.CRITICAL_RISK_THRESHOLD:
        final_score = 74.0  # Capped at High level
        reasons.append("Score capped at 74.0 (High): Guardrail enforced because name similarity alone cannot produce a Critical verdict.")
    else:
        final_score = raw_final_score

    # Determine Severity Classification
    if final_score >= settings.CRITICAL_RISK_THRESHOLD:
        severity = "critical"
    elif final_score >= settings.HIGH_RISK_THRESHOLD:
        severity = "high"
    elif final_score >= settings.MEDIUM_RISK_THRESHOLD:
        severity = "medium"
    else:
        severity = "low"

    # Context-Aware Recommended Action
    recommended_action = determine_recommended_action(
        severity=severity,
        confidence=confidence,
        has_identity_conflict=has_identity_conflict,
        has_scam_words=has_scam_words
    )

    summary_text = (
        f"Impersonation risk evaluated at {final_score}/100 ({severity.upper()}, {confidence.upper()} confidence). "
        f"Primary drivers: {reasons[0] if reasons else 'Normal lexical variance'}."
    )

    return {
        "score": final_score,
        "severity": severity,
        "confidence": confidence,
        "recommended_action": recommended_action,
        "summary": summary_text,
        "signals": signal_breakdowns,
        "weights_used": {k: round(v, 3) for k, v in normalized_weights.items()},
        "coverage_ratio": round(evidence_coverage_ratio, 2),
        "reasons": reasons,
        "missing_signals": missing_signals,
        "variations": signal_variations.get("name_similarity", {}),
        "disclaimer": "Heuristic composite score for analyst prioritization; not a statistical probability."
    }
