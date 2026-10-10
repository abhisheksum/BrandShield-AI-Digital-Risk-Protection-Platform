from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="SET NULL"), nullable=True)
    
    # Candidate details
    candidate_name = Column(String(255), nullable=False)
    candidate_type = Column(String(50), nullable=False)   # "social_account", "mobile_app"
    platform = Column(String(50), nullable=False)         # "twitter", "instagram", "google_play", etc.
    candidate_url = Column(String(1024), nullable=True)
    candidate_identifier = Column(String(255), nullable=True)  # handle, package id
    publisher_name = Column(String(255), nullable=True)
    logo_url = Column(String(1024), nullable=True)
    description = Column(Text, nullable=True)
    
    # Explainable Risk Scoring
    risk_score = Column(Float, nullable=False, default=0.0)    # 0.0 to 100.0
    severity = Column(String(20), nullable=False, default="medium") # "critical", "high", "medium", "low"
    structured_evidence = Column(Text, nullable=False)        # JSON string of signals & explanations
    
    # Investigation Workflow
    # "new", "under_investigation", "confirmed_impersonation", "takedown_requested", "resolved", "false_positive"
    status = Column(String(50), nullable=False, default="new")
    resolution_notes = Column(Text, nullable=True)
    
    # Metadata
    is_demo = Column(Integer, default=0)  # 1 for synthetic demo, 0 for live
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    brand = relationship("Brand", back_populates="alerts")
