from sqlalchemy.orm import Session

from app.core.exclusion import clean_identifier, clean_url
from app.core.normalization import normalize_text
from app.models.alert import Alert


def finding_already_exists(db: Session, brand_id: int, candidate: dict) -> bool:
    """Compare stable candidate identities to avoid repeated findings."""
    candidate_type = candidate.get("candidate_type", "social_account")
    platform = candidate.get("platform", "unknown")
    candidate_id = clean_identifier(candidate.get("candidate_identifier"))
    candidate_url = clean_url(candidate.get("candidate_url"))
    candidate_name = normalize_text(candidate.get("candidate_name", ""))

    existing_findings = db.query(Alert).filter(
        Alert.brand_id == brand_id,
        Alert.candidate_type == candidate_type,
        Alert.platform == platform,
    ).all()
    for existing in existing_findings:
        existing_id = clean_identifier(existing.candidate_identifier)
        existing_url = clean_url(existing.candidate_url)
        if candidate_id and existing_id and candidate_id == existing_id:
            return True
        if candidate_url and existing_url and candidate_url == existing_url:
            return True
        if not candidate_id and not candidate_url and candidate_name and candidate_name == normalize_text(existing.candidate_name):
            return True
    return False
