from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime

class OfficialAssetBase(BaseModel):
    asset_type: str = Field(..., description="'social', 'mobile_app', or 'domain'")
    platform: str = Field(..., description="e.g. 'twitter', 'instagram', 'google_play', 'apple_app_store', 'web'")
    identifier: str = Field(..., description="e.g. '@brand', 'com.brand.app', 'brand.com'")
    canonical_url: Optional[str] = None
    publisher_name: Optional[str] = None
    publisher_id: Optional[str] = None
    verified: bool = True

class OfficialAssetCreate(OfficialAssetBase):
    pass

class OfficialAssetResponse(OfficialAssetBase):
    id: int
    brand_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    industry: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    keywords: Optional[str] = None

class BrandCreate(BrandBase):
    pass

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    keywords: Optional[str] = None

class BrandResponse(BrandBase):
    id: int
    canonical_name: str
    logo_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    official_assets: List[OfficialAssetResponse] = []

    class Config:
        from_attributes = True
