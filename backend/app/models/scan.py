from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    scan_type = Column(String(50), nullable=False)      # "social", "app_store", "all"
    status = Column(String(50), nullable=False, default="in_progress") # "completed", "partial", "unavailable", "failed"
    is_demo = Column(Integer, default=0)                # 1 if synthetic/demo fixtures used, 0 for live
    source_summary = Column(Text, nullable=True)        # JSON status per collector
    total_candidates = Column(Integer, default=0)
    candidates_evaluated = Column(Integer, default=0, nullable=True)
    official_assets_excluded = Column(Integer, default=0, nullable=True)
    alerts_generated = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    brand = relationship("Brand", back_populates="scans")
