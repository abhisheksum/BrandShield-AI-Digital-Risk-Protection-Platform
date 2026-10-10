import json
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import csv
import io

from app.database import get_db
from app.models.alert import Alert
from app.models.brand import Brand
from app.schemas.alert import AlertResponse, AlertStatusUpdate, CandidateManualSubmit, AlertPaginatedResponse
from app.core.exclusion import is_official_asset
from app.core.scoring import calculate_explainable_risk_score
from app.core.findings import finding_already_exists
from app.config import settings
from app.api.auth import require_auth
from app.models.user import User

router = APIRouter(prefix="/alerts", tags=["Alerts"])
MAX_CSV_SIZE = 5 * 1024 * 1024
MAX_CSV_ROWS = 5000

def owned_brand(db: Session, brand_id: int, user: User) -> Brand:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.user_id == user.id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target brand not found")
    return brand

def format_alert(alert: Alert) -> dict:
    evidence = {}
    if alert.structured_evidence:
        try:
            evidence = json.loads(alert.structured_evidence)
        except Exception:
            evidence = {"raw": alert.structured_evidence}

    return {
        "id": alert.id,
        "brand_id": alert.brand_id,
        "scan_id": alert.scan_id,
        "candidate_name": alert.candidate_name,
        "candidate_type": alert.candidate_type,
        "platform": alert.platform,
        "candidate_url": alert.candidate_url,
        "candidate_identifier": alert.candidate_identifier,
        "publisher_name": alert.publisher_name,
        "logo_url": alert.logo_url,
        "description": alert.description,
        "risk_score": alert.risk_score,
        "severity": alert.severity,
        "confidence": alert.confidence or "medium",
        "recommended_action": alert.recommended_action or (evidence.get("recommended_action") if isinstance(evidence, dict) else None),
        "structured_evidence": evidence,
        "status": alert.status,
        "resolution_notes": alert.resolution_notes,
        "investigation_notes": alert.investigation_notes,
        "analyst_name": alert.analyst_name,
        "status_changed_at": alert.status_changed_at,
        "dismissed_at": alert.dismissed_at,
        "is_demo": alert.is_demo,
        "created_at": alert.created_at,
        "updated_at": alert.updated_at
    }

def apply_alert_filters(
    query,
    brand_id: Optional[int] = None,
    candidate_type: Optional[str] = None,
    platform: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None
):
    if brand_id:
        query = query.filter(Alert.brand_id == brand_id)
    if candidate_type and candidate_type != "all":
        query = query.filter(Alert.candidate_type == candidate_type)
    if platform and platform != "all":
        query = query.filter(Alert.platform.ilike(f"%{platform}%"))
    if severity and severity != "all":
        query = query.filter(Alert.severity == severity)
    if status_filter and status_filter != "all":
        query = query.filter(Alert.status == status_filter)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            query = query.filter(Alert.created_at >= dt_from)
        except Exception:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            query = query.filter(Alert.created_at <= dt_to)
        except Exception:
            pass
    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter(
            (Alert.candidate_name.ilike(s_term)) | 
            (Alert.candidate_identifier.ilike(s_term)) |
            (Alert.publisher_name.ilike(s_term)) |
            (Alert.description.ilike(s_term))
        )
    return query

def apply_alert_sorting(query, sort_by: Optional[str] = "risk_score_desc"):
    if sort_by == "risk_score_asc":
        return query.order_by(Alert.risk_score.asc())
    elif sort_by == "date_desc":
        return query.order_by(Alert.created_at.desc())
    elif sort_by == "date_asc":
        return query.order_by(Alert.created_at.asc())
    elif sort_by == "severity_desc":
        return query.order_by(Alert.risk_score.desc(), Alert.created_at.desc())
    else:  # default risk_score_desc
        return query.order_by(Alert.risk_score.desc(), Alert.created_at.desc())

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    brand_id: Optional[int] = None,
    candidate_type: Optional[str] = None,
    platform: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: Optional[str] = "risk_score_desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Retrieve filtered alerts list for Unified Threat Center with brand/platform/risk/date/status filters."""
    query = db.query(Alert).join(Brand).filter(Brand.user_id == current_user.id)
    query = apply_alert_filters(
        query,
        brand_id=brand_id,
        candidate_type=candidate_type,
        platform=platform,
        severity=severity,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        search=search
    )
    query = apply_alert_sorting(query, sort_by)
    alerts = query.all()
    return [format_alert(a) for a in alerts]


@router.get("/paginated", response_model=AlertPaginatedResponse)
def list_alerts_paginated(
    brand_id: Optional[int] = None,
    candidate_type: Optional[str] = None,
    platform: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: Optional[str] = "risk_score_desc",
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """Paginated list of alerts with unified brand, platform, risk level, date and status filters."""
    query = db.query(Alert).join(Brand).filter(Brand.user_id == current_user.id)
    query = apply_alert_filters(
        query,
        brand_id=brand_id,
        candidate_type=candidate_type,
        platform=platform,
        severity=severity,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        search=search
    )
    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 1

    query = apply_alert_sorting(query, sort_by)
    alerts = query.offset((page - 1) * size).limit(size).all()

    return {
        "items": [format_alert(a) for a in alerts],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }


@router.post("/manual", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def submit_manual_social_candidate(submission: CandidateManualSubmit, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """
    Allows SOC analysts to manually submit a suspect social or mobile candidate.
    Evaluates against Brand's Exclusion Registry, scores risk, and registers alert.
    """
    brand = owned_brand(db, submission.brand_id, current_user)

    cand_dict = {
        "candidate_name": submission.candidate_name,
        "candidate_type": "social_account",
        "platform": submission.platform,
        "candidate_identifier": submission.candidate_identifier,
        "candidate_url": submission.candidate_url,
        "description": submission.description or "",
        "publisher_name": submission.publisher_name or "",
        "logo_hash": None,
        "is_unverified_new_account": submission.is_unverified_new_account,
        "is_demo": False
    }

    # Exclusion check: Registered official handles and URLs are never flagged!
    if is_official_asset(cand_dict, brand.official_assets):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate '{submission.candidate_identifier}' matches a registered official asset in the Exclusion Registry and is whitelisted."
        )

    if finding_already_exists(db, brand.id, cand_dict):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This candidate is already recorded for the brand and platform.")

    brand_dict = {
        "name": brand.name,
        "description": brand.description or "",
        "logo_hash": brand.logo_hash,
    }

    risk_result = calculate_explainable_risk_score(brand_dict, cand_dict)
    score = risk_result["score"]
    severity = risk_result["severity"]
    confidence = risk_result.get("confidence", "medium")
    rec_action = risk_result.get("recommended_action")

    alert = Alert(
        brand_id=brand.id,
        scan_id=None,
        candidate_name=submission.candidate_name,
        candidate_type="social_account",
        platform=submission.platform,
        candidate_url=submission.candidate_url,
        candidate_identifier=submission.candidate_identifier,
        publisher_name=submission.publisher_name,
        description=submission.description,
        risk_score=score,
        severity=severity,
        confidence=confidence,
        recommended_action=rec_action,
        structured_evidence=json.dumps({**risk_result, "source_type": "manual_submission"}),
        status="new",
        is_demo=0
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return format_alert(alert)


@router.post("/import-csv", status_code=status.HTTP_201_CREATED)
async def import_candidates_csv(
    brand_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth)
):
    """
    Import candidates from CSV export.
    Required columns: candidate_name, platform, candidate_identifier.
    Optional columns: candidate_url, description, is_unverified_new_account.
    """
    brand = owned_brand(db, brand_id, current_user)

    content = await file.read(MAX_CSV_SIZE + 1)
    if len(content) > MAX_CSV_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="CSV file exceeds the 5MB limit.")
    try:
        decoded = content.decode("utf-8")
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be UTF-8 encoded text.")

    reader = csv.DictReader(io.StringIO(decoded))
    rows = list(reader)
    if len(rows) > MAX_CSV_ROWS:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"CSV file exceeds the {MAX_CSV_ROWS} row limit.")
    imported = 0
    exempted = 0
    duplicates = 0

    brand_dict = {
        "name": brand.name,
        "description": brand.description or "",
        "logo_hash": brand.logo_hash,
    }

    for row in rows:
        name = row.get("candidate_name") or row.get("name")
        handle = row.get("candidate_identifier") or row.get("handle")
        if not name or not handle:
            continue

        cand_dict = {
            "candidate_name": name.strip(),
            "candidate_type": "social_account",
            "platform": (row.get("platform") or "twitter").strip().lower(),
            "candidate_identifier": handle.strip(),
            "candidate_url": (row.get("candidate_url") or row.get("url") or "").strip(),
            "description": (row.get("description") or "").strip(),
            "is_unverified_new_account": (row.get("is_unverified_new_account") or "").strip().lower() in {"1", "true", "yes"},
            "is_demo": False
        }

        # Check exclusion
        if is_official_asset(cand_dict, brand.official_assets):
            exempted += 1
            continue

        if finding_already_exists(db, brand.id, cand_dict):
            duplicates += 1
            continue

        risk_res = calculate_explainable_risk_score(brand_dict, cand_dict)
        score = risk_res["score"]
        if score >= settings.ALERT_RISK_THRESHOLD:
            alert = Alert(
                brand_id=brand.id,
                candidate_name=cand_dict["candidate_name"],
                candidate_type="social_account",
                platform=cand_dict["platform"],
                candidate_url=cand_dict["candidate_url"],
                candidate_identifier=cand_dict["candidate_identifier"],
                description=cand_dict["description"],
                risk_score=score,
                severity=risk_res["severity"],
                confidence=risk_res.get("confidence", "medium"),
                recommended_action=risk_res.get("recommended_action"),
                structured_evidence=json.dumps({**risk_res, "source_type": "csv_import"}),
                status="new",
                is_demo=0
            )
            db.add(alert)
            db.flush()
            imported += 1

    db.commit()
    return {
        "message": f"CSV import evaluated successfully. Created {imported} new alerts, exempted {exempted} registered official assets, and skipped {duplicates} duplicates.",
        "imported": imported,
        "exempted": exempted,
        "duplicates": duplicates,
    }


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    alert = db.query(Alert).join(Brand).filter(Alert.id == alert_id, Brand.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return format_alert(alert)


@router.patch("/{alert_id}/status", response_model=AlertResponse)
def update_alert_status(alert_id: int, status_update: AlertStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """
    Analyst workflow endpoint:
    Updates alert status (including false-positive dismissal), investigation notes,
    resolution notes, analyst identity, and timestamps.
    """
    alert = db.query(Alert).join(Brand).filter(Alert.id == alert_id, Brand.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    now = datetime.now(timezone.utc)
    prev_status = alert.status
    alert.status = status_update.status
    alert.status_changed_at = now
    alert.updated_at = now

    if status_update.resolution_notes is not None:
        alert.resolution_notes = status_update.resolution_notes
    if status_update.investigation_notes is not None:
        alert.investigation_notes = status_update.investigation_notes
    if status_update.analyst_name is not None:
        alert.analyst_name = status_update.analyst_name

    # Track false-positive dismissal timestamp
    if status_update.status == "false_positive":
        alert.dismissed_at = now
    elif prev_status == "false_positive" and status_update.status != "false_positive":
        alert.dismissed_at = None

    db.commit()
    db.refresh(alert)
    return format_alert(alert)
