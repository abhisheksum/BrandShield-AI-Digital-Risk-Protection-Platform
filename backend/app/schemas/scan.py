from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class ScanTriggerRequest(BaseModel):
    brand_id: int
    scan_type: str = Field("all", pattern="^(social|app_store|all)$")
    use_demo_data: bool = Field(False, description="Use clearly labeled synthetic records for a demonstration")

class ScanResponse(BaseModel):
    id: int
    brand_id: int
    scan_type: str
    status: str
    is_demo: int
    source_summary: Optional[Dict[str, Any]] = None
    total_candidates: int
    candidates_evaluated: Optional[int] = None
    official_assets_excluded: Optional[int] = None
    alerts_generated: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
