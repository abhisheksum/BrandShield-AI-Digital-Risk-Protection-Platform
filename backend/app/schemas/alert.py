from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime

class RiskSignalDetail(BaseModel):
    weight: float
    raw_similarity: Optional[float] = None
    contribution: float
    available: bool
    explanation: str

class AlertBase(BaseModel):
    candidate_name: str
    candidate_type: str
    platform: str
    candidate_url: Optional[str] = None
    candidate_identifier: Optional[str] = None
    publisher_name: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None

class CandidateManualSubmit(BaseModel):
    brand_id: int
    candidate_name: str = Field(..., min_length=1, max_length=255)
    platform: str = Field(..., description="'twitter', 'instagram', 'telegram', 'linkedin', etc.")
    candidate_identifier: str = Field(..., min_length=1, max_length=255)
    candidate_url: Optional[str] = None
    description: Optional[str] = None
    publisher_name: Optional[str] = None
    logo_url: Optional[str] = None
    is_unverified_new_account: bool = False

    @field_validator("candidate_url", "logo_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        v_strip = v.strip()
        if not (v_strip.startswith("http://") or v_strip.startswith("https://") or v_strip.startswith("/")):
            raise ValueError("URL must start with http:// or https://")
        return v_strip

class AlertResponse(AlertBase):
    id: int
    brand_id: int
    scan_id: Optional[int] = None
    risk_score: float
    severity: str
    confidence: Optional[str] = "medium"
    recommended_action: Optional[str] = None
    structured_evidence: Dict[str, Any]
    status: str
    resolution_notes: Optional[str] = None
    investigation_notes: Optional[str] = None
    analyst_name: Optional[str] = None
    status_changed_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
    is_demo: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AlertStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(new|under_investigation|confirmed_impersonation|takedown_requested|resolved|false_positive)$")
    resolution_notes: Optional[str] = None
    investigation_notes: Optional[str] = None
    analyst_name: Optional[str] = None

class AlertPaginatedResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    size: int
    pages: int
