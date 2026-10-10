import urllib.parse
import re
from typing import List, Optional
from app.models.brand import OfficialAsset
from app.core.normalization import normalize_text

def clean_url(url: Optional[str]) -> str:
    """Normalize canonical URL for deterministic comparison, including critical query parameters like app id."""
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlparse(url.strip())
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = parsed.path.rstrip("/").lower()
        query = parsed.query.lower()
        if query:
            # Sort query parameters deterministically
            query_pairs = sorted(urllib.parse.parse_qsl(query))
            sorted_query = urllib.parse.urlencode(query_pairs)
            return f"{netloc}{path}?{sorted_query}"
        return f"{netloc}{path}"
    except Exception:
        return url.strip().lower()

def clean_identifier(identifier: Optional[str]) -> str:
    """Normalize handle/identifier: remove leading @, spaces, case folding."""
    if not identifier:
        return ""
    val = identifier.strip().lower()
    val = re.sub(r'^[@/]+', '', val)
    return val

def is_official_asset(
    candidate: dict,
    official_assets: List[OfficialAsset]
) -> bool:
    """
    Exclusion Engine:
    Excludes confirmed official assets before generating alerts.
    Does NOT rely on display-name equality.
    Compares:
    1. Canonical URLs (e.g. twitter.com/brand vs twitter.com/brand)
    2. Platform account identifiers / handles (e.g. @brand)
    3. Mobile application package identifiers (e.g. com.brand.app)
    4. Verified publisher details / developer IDs
    """
    cand_platform = (candidate.get("platform") or "").lower().strip()
    cand_url = clean_url(candidate.get("candidate_url") or candidate.get("url"))
    cand_id = clean_identifier(candidate.get("candidate_identifier") or candidate.get("identifier"))
    cand_pub = normalize_text(candidate.get("publisher_name") or candidate.get("publisher") or "")
    cand_type = (candidate.get("candidate_type") or candidate.get("type") or "").lower()

    for asset in official_assets:
        # Match by canonical URL
        if cand_url and asset.canonical_url:
            asset_clean_url = clean_url(asset.canonical_url)
            if cand_url == asset_clean_url:
                return True

        # Match by exact handle / identifier under the same platform
        if cand_id and asset.identifier:
            asset_clean_id = clean_identifier(asset.identifier)
            platform_match = not asset.platform or (asset.platform.lower() == cand_platform)
            if platform_match and cand_id == asset_clean_id:
                return True

        # For mobile apps: package identifier matching (e.g. com.brand.banking)
        if cand_type in ["mobile_app", "app"] or asset.asset_type == "mobile_app":
            if cand_id and asset.identifier and cand_id == clean_identifier(asset.identifier):
                return True
            # Also check if publisher name matches official asset publisher and verified
            if asset.publisher_name and cand_pub:
                asset_pub = normalize_text(asset.publisher_name)
                if asset_pub and cand_pub == asset_pub and cand_id.startswith(clean_identifier(asset.identifier).split(".")[0]):
                    return True

    return False
