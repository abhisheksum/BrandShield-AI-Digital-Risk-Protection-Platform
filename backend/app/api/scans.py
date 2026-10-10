import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.brand import Brand
from app.models.scan import Scan
from app.models.alert import Alert
from app.schemas.scan import ScanTriggerRequest, ScanResponse
from app.collectors.social_collector import SocialCollector
from app.collectors.app_collector import AppStoreCollector
from app.core.exclusion import is_official_asset
from app.core.scoring import calculate_explainable_risk_score
from app.config import settings

router = APIRouter(prefix="/scans", tags=["Scans"])

@router.post("", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def trigger_scan(request: ScanTriggerRequest, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == request.brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target brand not found")

    # Initialize Scan Audit Record
    scan = Scan(
        brand_id=brand.id,
        scan_type=request.scan_type,
        status="in_progress",
        is_demo=1 if request.use_demo_data else 0
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    collectors = []
    if request.scan_type in ["social", "all"]:
        collectors.append(SocialCollector())
    if request.scan_type in ["app_store", "all"]:
        collectors.append(AppStoreCollector())

    all_candidates = []
    source_statuses = {}

    for col in collectors:
        try:
            res = await col.collect(brand.name)
            all_candidates.extend(res.candidates)
            source_statuses[col.get_collector_name()] = res.to_dict()
        except Exception as e:
            source_statuses[col.get_collector_name()] = {
                "collector_name": col.get_collector_name(),
                "status": "failed",
                "error": str(e),
                "is_demo": False
            }

    # Brand target representation
    brand_dict = {
        "name": brand.name,
        "description": brand.description or "",
        "logo_hash": brand.logo_hash or "a1b2c3d4e5f60718:a1b2c3d4e5f60718",
        "official_publisher": brand.name
    }

    official_assets = brand.official_assets
    alerts_created = 0

    for cand in all_candidates:
        # Step 5: Check Trusted-Asset Exclusion
        if is_official_asset(cand, official_assets):
            # Confirmed official asset: Excluded!
            continue

        # Step 4: Calculate explainable risk score
        risk_result = calculate_explainable_risk_score(brand_dict, cand)
        score = risk_result["score"]

        # Only generate alert if risk score satisfies threshold
        if score >= settings.ALERT_RISK_THRESHOLD:
            # Check for duplicate candidate alert under this brand
            existing = db.query(Alert).filter(
                Alert.brand_id == brand.id,
                Alert.candidate_name == cand["candidate_name"],
                Alert.candidate_identifier == cand.get("candidate_identifier")
            ).first()

            if not existing:
                alert = Alert(
                    brand_id=brand.id,
                    scan_id=scan.id,
                    candidate_name=cand["candidate_name"],
                    candidate_type=cand.get("candidate_type", "social_account"),
                    platform=cand.get("platform", "unknown"),
                    candidate_url=cand.get("candidate_url"),
                    candidate_identifier=cand.get("candidate_identifier"),
                    publisher_name=cand.get("publisher_name"),
                    logo_url=cand.get("logo_url"),
                    description=cand.get("description"),
                    risk_score=score,
                    severity=risk_result["severity"],
                    structured_evidence=json.dumps(risk_result),
                    status="new",
                    is_demo=1 if cand.get("is_demo") else 0
                )
                db.add(alert)
                alerts_created += 1

    # Finalize scan status
    scan.total_candidates = len(all_candidates)
    scan.alerts_generated = alerts_created
    scan.status = "completed"
    scan.source_summary = json.dumps(source_statuses)
    scan.completed_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(scan)
    
    # Parse source summary back for response schema
    resp_dict = {
        "id": scan.id,
        "brand_id": scan.brand_id,
        "scan_type": scan.scan_type,
        "status": scan.status,
        "is_demo": scan.is_demo,
        "source_summary": source_statuses,
        "total_candidates": scan.total_candidates,
        "alerts_generated": scan.alerts_generated,
        "created_at": scan.created_at,
        "completed_at": scan.completed_at
    }
    return resp_dict

@router.get("", response_model=List[ScanResponse])
def list_scans(brand_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Scan)
    if brand_id:
        query = query.filter(Scan.brand_id == brand_id)
    scans = query.order_by(Scan.created_at.desc()).all()
    
    result = []
    for s in scans:
        summary = json.loads(s.source_summary) if s.source_summary else None
        result.append({
            "id": s.id,
            "brand_id": s.brand_id,
            "scan_type": s.scan_type,
            "status": s.status,
            "is_demo": s.is_demo,
            "source_summary": summary,
            "total_candidates": s.total_candidates,
            "alerts_generated": s.alerts_generated,
            "created_at": s.created_at,
            "completed_at": s.completed_at
        })
    return result
