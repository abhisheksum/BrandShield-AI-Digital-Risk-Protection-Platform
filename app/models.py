from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

def now(): return datetime.now(timezone.utc)

class Brand(Base):
    __tablename__ = "brands"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    industry: Mapped[str] = mapped_column(String(120), default="")
    website: Mapped[str] = mapped_column(String(500), default="")
    logo_path: Mapped[str] = mapped_column(String(500), default="")
    aliases: Mapped[list] = mapped_column(JSON, default=list)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    assets: Mapped[list["OfficialAsset"]] = relationship(back_populates="brand", cascade="all, delete-orphan")

class OfficialAsset(Base):
    __tablename__ = "official_assets"
    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    platform: Mapped[str] = mapped_column(String(80), default="")
    name: Mapped[str] = mapped_column(String(200), default="")
    handle: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    identifier: Mapped[str] = mapped_column(String(250), default="")
    publisher: Mapped[str] = mapped_column(String(200), default="")
    declared: Mapped[bool] = mapped_column(Boolean, default=True)
    brand: Mapped[Brand] = relationship(back_populates="assets")

class Scan(Base):
    __tablename__ = "scans"
    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="completed")
    source_status: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Candidate(Base):
    __tablename__ = "candidates"
    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    stable_id: Mapped[str] = mapped_column(String(500), nullable=False)
    platform: Mapped[str] = mapped_column(String(100), default="")
    name: Mapped[str] = mapped_column(String(250), default="")
    handle: Mapped[str] = mapped_column(String(250), default="")
    url: Mapped[str] = mapped_column(String(700), default="")
    identifier: Mapped[str] = mapped_column(String(250), default="")
    publisher: Mapped[str] = mapped_column(String(250), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    source_type: Mapped[str] = mapped_column(String(20), default="synthetic")
    source_name: Mapped[str] = mapped_column(String(200), default="")
    retrieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint("brand_id", "kind", "stable_id", name="uq_candidate_stable"),)

class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[int] = mapped_column(primary_key=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("scans.id"), index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    official_match: Mapped[bool] = mapped_column(Boolean, default=False)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[str] = mapped_column(String(30), default="insufficient_evidence")
    reasons: Mapped[list] = mapped_column(JSON, default=list)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    review_status: Mapped[str] = mapped_column(String(30), default="open")
    __table_args__ = (UniqueConstraint("scan_id", "candidate_id", name="uq_finding_scan_candidate"),)
