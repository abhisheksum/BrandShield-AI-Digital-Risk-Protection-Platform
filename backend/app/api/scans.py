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
from app.core.findings import finding_already_exists
from app.config import settings
from app.api.auth import require_auth
from app.models.user import User

router = APIRouter(prefix="/scans", tags=["Scans"])

@router.post("", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def trigger_scan(request: ScanTriggerRequest, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    brand = db.query(Brand).filter(Brand.id == request.brand_id, Brand.user_id == current_user.id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target brand not found")

    # Initialize Scan Audit Record
    scan = Scan(
        brand_id=brand.id,
        scan_type=request.scan_type,
        status="in_progress",
        is_demo=0
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    collectors = []
    if request.scan_type in ["social", "all"]:
        collectors.append(SocialCollector(mode="demo" if request.use_demo_data else "live"))
    if request.scan_type in ["app_store", "all"]:
        collectors.append(AppStoreCollector(mode="demo" if request.use_demo_data else "live"))

    all_candidates = []
    source_statuses = {}

    for col in collectors:
        try:
            res = await col.collect(brand.name)
            source_name = col.get_collector_name()
            all_candidates.extend((candidate, source_name) for candidate in res.candidates)
            source_statuses[source_name] = {
                **res.to_dict(),
                "candidates_evaluated": 0,
                "official_assets_excluded": 0,
                "findings_generated": 0,
            }
        except Exception as e:
            source_name = col.get_collector_name()
            source_statuses[source_name] = {
                "collector_name": source_name,
                "status": "failed",
                "candidates_count": 0,
                "candidates_evaluated": 0,
                "official_assets_excluded": 0,
                "findings_generated": 0,
                "message": "The source failed before returning results.",
                "error_details": str(e),
                "is_demo": False
            }

    # Persist provenance from sources that actually returned successfully;
    # selecting demo mode alone is not evidence that synthetic records arrived.
    scan.is_demo = int(any(source.get("is_demo", False) for source in source_statuses.values()))

    # Brand target representation
    brand_dict = {
        "name": brand.name,
        "description": brand.description or "",
        # Do not substitute demo hashes when the organisation has not supplied
        # an official logo; missing telemetry must remain missing evidence.
        "logo_hash": brand.logo_hash,
    }

    official_assets = brand.official_assets
    alerts_created = 0
    candidates_evaluated = 0
    official_assets_excluded = 0

    for cand, source_name in all_candidates:
        # Step 5: Check Trusted-Asset Exclusion
        if is_official_asset(cand, official_assets):
            # Confirmed official asset: Excluded!
            official_assets_excluded += 1
            source_statuses[source_name]["official_assets_excluded"] += 1
            continue

        # Step 4: Calculate explainable risk score
        candidates_evaluated += 1
        source_statuses[source_name]["candidates_evaluated"] += 1
        candidate_brand_data = dict(brand_dict)
        if cand.get("candidate_type") == "mobile_app":
            registered_publishers = {
                asset.publisher_name.strip()
                for asset in official_assets
                if asset.asset_type == "mobile_app"
                and asset.platform == cand.get("platform")
                and asset.publisher_name
            }
            if len(registered_publishers) == 1:
                candidate_brand_data["official_publisher"] = next(iter(registered_publishers))
        risk_result = calculate_explainable_risk_score(candidate_brand_data, cand)
        score = risk_result["score"]

        # Only generate alert if risk score satisfies threshold
        if score >= settings.ALERT_RISK_THRESHOLD:
            # Check for duplicate candidate alert under this brand
            if not finding_already_exists(db, brand.id, cand):
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
                    confidence=risk_result.get("confidence", "medium"),
                    recommended_action=risk_result.get("recommended_action"),
                    structured_evidence=json.dumps({
                        **risk_result,
                        "source_type": "demo_data" if cand.get("is_demo") else ("live_source" if cand.get("source_provenance") == "live" else "source_unavailable"),
                        "source_provenance": cand.get("source_provenance", "demo" if cand.get("is_demo") else "unknown"),
                        "source_collector": cand.get("source_collector"),
                    }),
                    status="new",
                    is_demo=1 if cand.get("is_demo") else 0
                )
                db.add(alert)
                db.flush()
                alerts_created += 1
                source_statuses[source_name]["findings_generated"] += 1

    # Finalize scan status based on collector health
    scan.total_candidates = len(all_candidates)
    scan.candidates_evaluated = candidates_evaluated
    scan.official_assets_excluded = official_assets_excluded
    scan.alerts_generated = alerts_created

    # Evaluate overall scan status: completed, partial, or failed
    statuses = [s.get("status") for s in source_statuses.values()]
    if all(st == "completed" for st in statuses):
        scan.status = "completed"
    elif any(st == "completed" for st in statuses):
        scan.status = "partial"
    else:
        scan.status = "failed"

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
        "candidates_evaluated": scan.candidates_evaluated,
        "official_assets_excluded": scan.official_assets_excluded,
        "alerts_generated": scan.alerts_generated,
        "created_at": scan.created_at,
        "completed_at": scan.completed_at
    }
    return resp_dict

@router.get("", response_model=List[ScanResponse])
def list_scans(brand_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    query = db.query(Scan).join(Brand).filter(Brand.user_id == current_user.id)
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
            "candidates_evaluated": s.candidates_evaluated,
            "official_assets_excluded": s.official_assets_excluded,
            "alerts_generated": s.alerts_generated,
            "created_at": s.created_at,
            "completed_at": s.completed_at
        })
    return result
