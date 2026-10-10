from rapidfuzz import fuzz, distance
from typing import Dict, Any
from app.core.normalization import normalize_text

def compute_string_similarity(target_name: str, candidate_name: str) -> Dict[str, Any]:
    """
    Computes multifaceted string similarity between target brand and candidate string.
    Returns:
    - combined_score: float (0.0 to 100.0)
    - metrics: dictionary with ratio, partial_ratio, token_sort_ratio, token_set_ratio, levenshtein_distance
    - explanation: string describing patterns (e.g. typosquat, exact match, added words)
    """
    if not target_name or not candidate_name:
        return {
            "score": 0.0,
            "metrics": {},
            "explanation": "Missing name for comparison"
        }

    norm_target = normalize_text(target_name)
    norm_candidate = normalize_text(candidate_name)

    # If normalized strings are identical -> 100% match
    if norm_target == norm_candidate:
        return {
            "score": 100.0,
            "metrics": {
                "ratio": 100.0,
                "token_sort_ratio": 100.0,
                "token_set_ratio": 100.0,
                "levenshtein_distance": 0
            },
            "explanation": "Exact normalized string match (including homoglyphs/substitutions)"
        }

    # Remove all spaces for continuous name comparison (e.g., 'brandshield' vs 'brand shield')
    target_compact = norm_target.replace(" ", "")
    candidate_compact = norm_candidate.replace(" ", "")

    ratio = fuzz.ratio(norm_target, norm_candidate)
    compact_ratio = fuzz.ratio(target_compact, candidate_compact)
    partial_ratio = fuzz.partial_ratio(norm_target, norm_candidate)
    token_sort = fuzz.token_sort_ratio(norm_target, norm_candidate)
    token_set = fuzz.token_set_ratio(norm_target, norm_candidate)
    lev_dist = distance.Levenshtein.distance(target_compact, candidate_compact)

    # Check for specific impersonation patterns
    patterns = []
    
    # 1. Combosquatting: Target compact is contained entirely within candidate
    is_contained = target_compact in candidate_compact
    if is_contained:
        patterns.append(f"Contains target brand name '{target_name}' with added keywords/affixes")

    # 2. Typosquatting: Small edit distance
    max_len = max(len(target_compact), len(candidate_compact))
    if lev_dist <= 2 and max_len >= 4:
        patterns.append(f"Likely typosquatting / character transposition (edit distance: {lev_dist})")

    # Weighted string similarity
    # If the target name is fully embedded inside candidate, token_set / partial ratio is heavily weighted
    if is_contained:
        score = max(token_set * 0.9, partial_ratio * 0.85, compact_ratio)
    elif lev_dist <= 2 and max_len >= 4:
        score = max(compact_ratio, ratio, 85.0 - (lev_dist * 5.0))
    else:
        # Standard weighted composite
        score = (compact_ratio * 0.4) + (token_sort * 0.3) + (token_set * 0.3)

    score = min(100.0, max(0.0, round(float(score), 2)))

    explanation = "; ".join(patterns) if patterns else f"Fuzzy string similarity of {score}%"

    return {
        "score": score,
        "metrics": {
            "ratio": round(ratio, 2),
            "compact_ratio": round(compact_ratio, 2),
            "partial_ratio": round(partial_ratio, 2),
            "token_sort_ratio": round(token_sort, 2),
            "token_set_ratio": round(token_set, 2),
            "levenshtein_distance": lev_dist
        },
        "explanation": explanation
    }
