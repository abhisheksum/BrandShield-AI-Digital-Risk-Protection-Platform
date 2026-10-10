from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class RiskSignalDetail(BaseModel):
    weight: float
    raw_similarity: Optional[float] = None
    contribution: float
    available: bool
    explanation: str

class StructuredEvidence(BaseModel):
    name_similarity: RiskSignalDetail
    logo_similarity: RiskSignalDetail
    description_similarity: RiskSignalDetail
    publisher_mismatch: RiskSignalDetail
    suspicious_indicators: RiskSignalDetail
    summary_explanation: str
    reasons: List[str] = []
    missing_signals: List[str] = []

class AlertBase(BaseModel):
    candidate_name: str
    candidate_type: str
    platform: str
    candidate_url: Optional[str] = None
    candidate_identifier: Optional[str] = None
    publisher_name: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None

class AlertResponse(AlertBase):
    id: int
    brand_id: int
    scan_id: Optional[int] = None
    risk_score: float
    severity: str
    structured_evidence: Dict[str, Any]
    status: str
    resolution_notes: Optional[str] = None
    is_demo: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(new|under_investigation|confirmed_impersonation|takedown_requested|resolved|false_positive)$")
    resolution_notes: Optional[str] = None
