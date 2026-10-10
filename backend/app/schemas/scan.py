from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class ScanTriggerRequest(BaseModel):
    brand_id: int
    scan_type: str = Field("all", pattern="^(social|app_store|all)$")
    use_demo_data: bool = Field(True, description="Whether to include synthetic demo records alongside collectors")

class ScanResponse(BaseModel):
    id: int
    brand_id: int
    scan_type: str
    status: str
    is_demo: int
    source_summary: Optional[Dict[str, Any]] = None
    total_candidates: int
    alerts_generated: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
