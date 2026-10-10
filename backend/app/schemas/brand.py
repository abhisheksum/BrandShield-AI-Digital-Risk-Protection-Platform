from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
import re

class OfficialAssetBase(BaseModel):
    asset_type: str = Field(..., description="'social', 'mobile_app', or 'domain'")
    platform: str = Field(..., description="e.g. 'twitter', 'instagram', 'telegram', 'google_play', 'apple_app_store', 'web'")
    identifier: str = Field(..., min_length=1, max_length=255, description="e.g. '@brand', 'com.brand.app', 'brand.com'")
    app_name: Optional[str] = Field(None, max_length=255, description="Official app display name")
    canonical_url: Optional[str] = Field(None, max_length=1024)
    publisher_name: Optional[str] = Field(None, max_length=255, description="Official developer or publisher name")
    publisher_id: Optional[str] = Field(None, max_length=255)
    verified: bool = False
    notes: Optional[str] = None

    @field_validator("canonical_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        v_strip = v.strip()
        if not (v_strip.startswith("http://") or v_strip.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v_strip

class OfficialAssetCreate(OfficialAssetBase):
    pass

class OfficialAssetUpdate(BaseModel):
    asset_type: Optional[str] = None
    platform: Optional[str] = None
    identifier: Optional[str] = None
    app_name: Optional[str] = None
    canonical_url: Optional[str] = None
    publisher_name: Optional[str] = None
    publisher_id: Optional[str] = None
    verified: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("canonical_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        v_strip = v.strip()
        if not (v_strip.startswith("http://") or v_strip.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v_strip

class OfficialAssetResponse(OfficialAssetBase):
    id: int
    brand_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    website: Optional[str] = Field(None, max_length=1024)
    industry: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=1024)
    keywords: Optional[str] = None
    aliases: Optional[str] = None

    @field_validator("website", "logo_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        v_strip = v.strip()
        if not (v_strip.startswith("http://") or v_strip.startswith("https://") or v_strip.startswith("/")):
            raise ValueError("URL must start with http://, https://, or a valid path")
        return v_strip

class BrandCreate(BrandBase):
    official_assets: Optional[List[OfficialAssetCreate]] = []

class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    website: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    keywords: Optional[str] = None
    aliases: Optional[str] = None

    @field_validator("website", "logo_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        v_strip = v.strip()
        if not (v_strip.startswith("http://") or v_strip.startswith("https://") or v_strip.startswith("/")):
            raise ValueError("URL must start with http://, https://, or a valid path")
        return v_strip

class BrandResponse(BrandBase):
    id: int
    canonical_name: str
    logo_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    official_assets: List[OfficialAssetResponse] = []

    model_config = ConfigDict(from_attributes=True)
