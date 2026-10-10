import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse, AlertStatusUpdate

router = APIRouter(prefix="/alerts", tags=["Alerts"])

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
        "structured_evidence": evidence,
        "status": alert.status,
        "resolution_notes": alert.resolution_notes,
        "is_demo": alert.is_demo,
        "created_at": alert.created_at,
        "updated_at": alert.updated_at
    }

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    brand_id: Optional[int] = None,
    candidate_type: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if brand_id:
        query = query.filter(Alert.brand_id == brand_id)
    if candidate_type:
        query = query.filter(Alert.candidate_type == candidate_type)
    if severity:
        query = query.filter(Alert.severity == severity)
    if status_filter:
        query = query.filter(Alert.status == status_filter)

    alerts = query.order_by(Alert.risk_score.desc(), Alert.created_at.desc()).all()
    return [format_alert(a) for a in alerts]

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return format_alert(alert)

@router.patch("/{alert_id}/status", response_model=AlertResponse)
def update_alert_status(alert_id: int, update_in: AlertStatusUpdate, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.status = update_in.status
    if update_in.resolution_notes is not None:
        alert.resolution_notes = update_in.resolution_notes
    alert.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(alert)
    return format_alert(alert)
