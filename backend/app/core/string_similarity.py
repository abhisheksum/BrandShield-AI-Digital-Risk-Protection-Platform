from rapidfuzz import fuzz, distance
from typing import Dict, Any, List
import re
from app.core.normalization import normalize_text, extract_tokens

COMMON_SUSPICIOUS_WORDS = {
    "official", "support", "help", "helpdesk", "care", "service", "desk", 
    "verify", "verified", "security", "team", "global", "agent", "auth",
    "login", "portal", "bonus", "reward", "giveaway", "claim", "free",
    "wallet", "admin", "direct", "fast", "urgent", "update", "recovery"
}

def analyze_character_variations(target: str, candidate: str) -> Dict[str, Any]:
    """
    Analyzes specific string differences between target and candidate:
    - insertions: extra characters added into the word
    - deletions: missing characters from target
    - swaps / transpositions: adjacent character swaps
    - added_words: extra vocabulary attached to the brand name
    - punctuation_changes: dots, underscores, hyphens inserted to bypass filters
    """
    norm_t = normalize_text(target)
    norm_c = normalize_text(candidate)

    compact_t = re.sub(r'[^a-z0-9]', '', norm_t)
    compact_c = re.sub(r'[^a-z0-9]', '', norm_c)

    # 1. Added words detection
    tokens_t = extract_tokens(target)
    tokens_c = extract_tokens(candidate)
    added_tokens = tokens_c - tokens_t
    suspicious_added = [tok for tok in added_tokens if tok in COMMON_SUSPICIOUS_WORDS]

    # 2. Levenshtein edit distance & character variations
    edit_ops = distance.Levenshtein.editops(compact_t, compact_c)
    insertions = 0
    deletions = 0
    substitutions = 0

    for op in edit_ops:
        tag = op[0]
        if tag == 'insert':
            insertions += 1
        elif tag == 'delete':
            deletions += 1
        elif tag == 'replace':
            substitutions += 1

    # Check for adjacent transposition (e.g. 'tehc' vs 'tech')
    osa_dist = distance.OSA.distance(compact_t, compact_c)
    lev_dist = len(edit_ops)
    swaps = max(0, lev_dist - osa_dist)

    # Punctuation/delimiter insertion (e.g. 'red.shield', 'red_shield')
    has_delimiter_split = bool(re.search(r'[_\.\-\+]', candidate) and not re.search(r'[_\.\-\+]', target))

    return {
        "norm_target": norm_t,
        "norm_candidate": norm_c,
        "compact_target": compact_t,
        "compact_candidate": compact_c,
        "levenshtein_distance": lev_dist,
        "insertions": insertions,
        "deletions": deletions,
        "substitutions": substitutions,
        "swaps": swaps,
        "added_tokens": list(added_tokens),
        "suspicious_added_words": suspicious_added,
        "has_delimiter_split": has_delimiter_split,
    }


def compute_string_similarity(target_name: str, candidate_name: str) -> Dict[str, Any]:
    """
    Computes multifaceted string similarity between target brand and candidate string.
    Returns:
    - score: float (0.0 to 100.0)
    - metrics: dictionary with ratio, partial_ratio, token_sort_ratio, token_set_ratio, levenshtein_distance
    - variations: specific character mutations (insertion, deletion, swap, added words)
    - explanation: string describing detection patterns
    """
    if not target_name or not candidate_name:
        return {
            "score": 0.0,
            "metrics": {},
            "variations": {},
            "explanation": "Missing string for comparison"
        }

    variations = analyze_character_variations(target_name, candidate_name)
    norm_target = variations["norm_target"]
    norm_candidate = variations["norm_candidate"]
    compact_t = variations["compact_target"]
    compact_c = variations["compact_candidate"]

    # Exact normalized match
    if norm_target == norm_candidate:
        return {
            "score": 100.0,
            "metrics": {
                "ratio": 100.0,
                "token_sort_ratio": 100.0,
                "token_set_ratio": 100.0,
                "levenshtein_distance": 0
            },
            "variations": variations,
            "explanation": "Exact normalized string match (including homoglyph/character substitutions)"
        }

    ratio = fuzz.ratio(norm_target, norm_candidate)
    compact_ratio = fuzz.ratio(compact_t, compact_c)
    partial_ratio = fuzz.partial_ratio(norm_target, norm_candidate)
    token_sort = fuzz.token_sort_ratio(norm_target, norm_candidate)
    token_set = fuzz.token_set_ratio(norm_target, norm_candidate)
    lev_dist = variations["levenshtein_distance"]

    patterns = []

    # Combosquatting / Added Words detection
    is_contained = compact_t in compact_c
    if is_contained and len(compact_c) > len(compact_t) + 1:
        if variations["suspicious_added_words"]:
            patterns.append(f"Combosquatting: target brand name embedded with high-risk words: {', '.join(variations['suspicious_added_words'])}")
        else:
            patterns.append(f"Contains target brand name with additional keywords ({', '.join(variations['added_tokens'])})")

    # Character mutations / Typosquatting
    if lev_dist <= 2 and len(compact_t) >= 4 and not is_contained:
        patterns.append(f"Likely typosquatting / character mutation (edit distance: {lev_dist})")
    elif is_contained and len(compact_c) <= len(compact_t) + 1:
        patterns.append(f"Likely typosquatting / character repetition (similarity: {ratio}%)")
    elif variations["swaps"] > 0:
        patterns.append(f"Character swap/transposition detected ({variations['swaps']} swap)")
    if variations["substitutions"] > 0 and lev_dist <= 2:
        patterns.append(f"Character substitution detected ({variations['substitutions']} char)")
    if variations["insertions"] > 0 and lev_dist <= 3 and not is_contained:
        patterns.append(f"Character insertion detected ({variations['insertions']} char)")
    if variations["deletions"] > 0 and lev_dist <= 2:
        patterns.append(f"Character omission/deletion detected ({variations['deletions']} char)")
    if variations["has_delimiter_split"]:
        patterns.append("Punctuation/delimiter insertion to bypass keyword filters")

    # Calculate weighted composite score
    if is_contained:
        # If target brand is completely contained, base similarity starts high
        base_score = max(75.0, 0.4 * compact_ratio + 0.3 * partial_ratio + 0.3 * token_set)
        if variations["suspicious_added_words"]:
            base_score = min(98.0, base_score + 10.0)
    elif lev_dist <= 2 and len(compact_t) >= 4:
        # Typosquat / single character mutation
        base_score = max(80.0, compact_ratio)
    else:
        base_score = (
            0.25 * ratio +
            0.25 * compact_ratio +
            0.25 * token_sort +
            0.25 * token_set
        )

    score = round(min(100.0, max(0.0, base_score)), 1)
    explanation = "; ".join(patterns) if patterns else f"Fuzzy lexical match of {score}%"

    return {
        "score": score,
        "metrics": {
            "ratio": round(ratio, 1),
            "compact_ratio": round(compact_ratio, 1),
            "partial_ratio": round(partial_ratio, 1),
            "token_sort_ratio": round(token_sort, 1),
            "token_set_ratio": round(token_set, 1),
            "levenshtein_distance": lev_dist,
        },
        "variations": variations,
        "explanation": explanation
    }
