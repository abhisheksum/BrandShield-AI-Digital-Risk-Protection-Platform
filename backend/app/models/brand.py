from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    canonical_name = Column(String(255), nullable=False)
    website = Column(String(1024), nullable=True)
    industry = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(1024), nullable=True)
    logo_hash = Column(String(64), nullable=True)  # Perceptual hash
    keywords = Column(Text, nullable=True)  # Comma-separated or JSON list
    aliases = Column(Text, nullable=True)   # Comma-separated brand aliases / trade names
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    official_assets = relationship("OfficialAsset", back_populates="brand", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="brand", cascade="all, delete-orphan")
    scans = relationship("Scan", back_populates="brand", cascade="all, delete-orphan")


class OfficialAsset(Base):
    __tablename__ = "official_assets"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String(50), nullable=False)  # "social", "mobile_app", "domain"
    platform = Column(String(50), nullable=False)    # "twitter", "instagram", "telegram", "google_play", "apple_app_store", "web"
    identifier = Column(String(255), nullable=False) # e.g. "@brand", "com.brand.app", "brand.com"
    app_name = Column(String(255), nullable=True)    # e.g. "ApexPay Mobile Banking"
    canonical_url = Column(String(1024), nullable=True)
    publisher_name = Column(String(255), nullable=True)
    publisher_id = Column(String(255), nullable=True)
    verified = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    brand = relationship("Brand", back_populates="official_assets")
