from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.brand import Brand, OfficialAsset
from app.schemas.brand import BrandCreate, BrandResponse, BrandUpdate, OfficialAssetCreate, OfficialAssetResponse
from app.core.normalization import normalize_text

router = APIRouter(prefix="/brands", tags=["Brands"])

@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(brand_in: BrandCreate, db: Session = Depends(get_db)):
    existing = db.query(Brand).filter(Brand.name.ilike(brand_in.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Brand with name '{brand_in.name}' is already registered."
        )

    canonical_name = normalize_text(brand_in.name)
    brand = Brand(
        name=brand_in.name,
        canonical_name=canonical_name,
        industry=brand_in.industry,
        description=brand_in.description,
        logo_url=brand_in.logo_url,
        logo_hash="a1b2c3d4e5f60718:a1b2c3d4e5f60718" if brand_in.logo_url else None,
        keywords=brand_in.keywords
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand

@router.get("", response_model=List[BrandResponse])
def list_brands(db: Session = Depends(get_db)):
    return db.query(Brand).order_by(Brand.created_at.desc()).all()

@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return brand

@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    db.delete(brand)
    db.commit()
    return None

# Official Assets endpoints
@router.post("/{brand_id}/assets", response_model=OfficialAssetResponse, status_code=status.HTTP_201_CREATED)
def add_official_asset(brand_id: int, asset_in: OfficialAssetCreate, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")

    asset = OfficialAsset(
        brand_id=brand_id,
        asset_type=asset_in.asset_type,
        platform=asset_in.platform,
        identifier=asset_in.identifier,
        canonical_url=asset_in.canonical_url,
        publisher_name=asset_in.publisher_name,
        publisher_id=asset_in.publisher_id,
        verified=asset_in.verified
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

@router.get("/{brand_id}/assets", response_model=List[OfficialAssetResponse])
def list_official_assets(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return brand.official_assets

@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_official_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(OfficialAsset).filter(OfficialAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Official asset not found")
    db.delete(asset)
    db.commit()
    return None
