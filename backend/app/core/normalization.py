import unicodedata
import re

# Common visual confusable / homoglyph mapping (Cyrillic, Greek, numbers to Latin)
HOMOGLYPH_MAP = {
    'а': 'a', 'а́': 'a', 'а̀': 'a', 'ä': 'a', 'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
    'с': 'c', 'ç': 'c', 'ć': 'c', 'č': 'c',
    'е': 'e', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ė': 'e', 'ę': 'e',
    'і': 'i', 'і́': 'i', 'ï': 'i', 'ì': 'i', 'í': 'i', 'î': 'i', '1': 'l', '!': 'i', '|': 'l',
    'ј': 'j',
    'о': 'o', 'ö': 'o', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', '0': 'o', 'ø': 'o',
    'р': 'p',
    'ѕ': 's', '$': 's', 'š': 's', 'ś': 's',
    'у': 'y', 'ÿ': 'y', 'ý': 'y',
    'х': 'x',
    'ѵ': 'v', 'ν': 'v',
    '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a',
}

def normalize_text(text: str) -> str:
    """
    Normalizes a string for security and brand impersonation detection:
    1. Unicode NFKC normalization
    2. Lowercase / case folding
    3. Homoglyph character substitution
    4. Strip zero-width characters and unusual whitespace
    5. Strip excessive punctuation and whitespace
    """
    if not text:
        return ""

    # 1. Unicode NFKC normalization
    normalized = unicodedata.normalize("NFKC", text)

    # 2. Case folding
    normalized = normalized.casefold()

    # 3. Strip zero-width characters (ZWSP, ZWNJ, etc.)
    normalized = re.sub(r'[\u200B-\u200D\uFEFF]', '', normalized)

    # 4. Homoglyph mapping
    chars = []
    for ch in normalized:
        chars.append(HOMOGLYPH_MAP.get(ch, ch))
    normalized = "".join(chars)

    # 5. Clean punctuation and collapse whitespace
    normalized = re.sub(r'[_\-\.\+@#/\\]+', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized

def extract_tokens(text: str) -> set:
    """Extract distinct alphanumeric tokens from normalized string."""
    clean = normalize_text(text)
    return set(re.findall(r'[a-z0-9]+', clean))
