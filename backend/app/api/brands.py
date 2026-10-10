import os
import uuid
import io
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.brand import Brand, OfficialAsset
from app.schemas.brand import (
    BrandCreate, 
    BrandResponse, 
    BrandUpdate, 
    OfficialAssetCreate, 
    OfficialAssetUpdate, 
    OfficialAssetResponse
)
from app.core.normalization import normalize_text
from app.core.image_similarity import calculate_image_hash_from_bytes
from app.api.auth import require_auth
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/brands", tags=["Brands"])

def owned_brand(db: Session, brand_id: int, user: User) -> Brand:
    brand = db.query(Brand).filter(Brand.id == brand_id, Brand.user_id == user.id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return brand

# Directory for secure uploads
UPLOAD_DIR = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"jpeg", "png", "webp", "gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# -------------------------------------------------------------
# Brand CRUD Endpoints
# -------------------------------------------------------------

@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(brand_in: BrandCreate, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Create a new Brand with optional embedded initial official assets."""
    existing = db.query(Brand).filter(Brand.user_id == current_user.id, Brand.name.ilike(brand_in.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Brand with name '{brand_in.name}' is already registered."
        )

    canonical_name = normalize_text(brand_in.name)
    brand = Brand(
        user_id=current_user.id,
        name=brand_in.name.strip(),
        canonical_name=canonical_name,
        website=brand_in.website,
        industry=brand_in.industry,
        description=brand_in.description,
        logo_url=brand_in.logo_url,
        logo_hash=None,
        keywords=brand_in.keywords,
        aliases=brand_in.aliases
    )
    db.add(brand)
    db.flush()  # Generates brand.id

    # Create embedded initial assets if provided
    if brand_in.official_assets:
        for asset_in in brand_in.official_assets:
            asset = OfficialAsset(
                brand_id=brand.id,
                asset_type=asset_in.asset_type,
                platform=asset_in.platform,
                identifier=asset_in.identifier.strip(),
                app_name=asset_in.app_name,
                canonical_url=asset_in.canonical_url,
                publisher_name=asset_in.publisher_name,
                publisher_id=asset_in.publisher_id,
                verified=False,
                notes=asset_in.notes
            )
            db.add(asset)

    db.commit()
    db.refresh(brand)
    return brand

@router.get("", response_model=List[BrandResponse])
def list_brands(db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Retrieve all registered brand profiles with their official assets."""
    return db.query(Brand).filter(Brand.user_id == current_user.id).order_by(Brand.created_at.desc()).all()

@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Retrieve single brand profile by ID."""
    return owned_brand(db, brand_id, current_user)

@router.put("/{brand_id}", response_model=BrandResponse)
def update_brand(brand_id: int, brand_update: BrandUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Update existing brand profile fields."""
    brand = owned_brand(db, brand_id, current_user)

    update_dict = brand_update.model_dump(exclude_unset=True)

    if "name" in update_dict and update_dict["name"]:
        new_name = update_dict["name"].strip()
        conflict = db.query(Brand).filter(Brand.user_id == current_user.id, Brand.name.ilike(new_name), Brand.id != brand_id).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another brand with name '{new_name}' already exists."
            )
        brand.name = new_name
        brand.canonical_name = normalize_text(new_name)

    if "website" in update_dict:
        brand.website = update_dict["website"]
    if "industry" in update_dict:
        brand.industry = update_dict["industry"]
    if "description" in update_dict:
        brand.description = update_dict["description"]
    if "logo_url" in update_dict:
        brand.logo_url = update_dict["logo_url"]
    if "keywords" in update_dict:
        brand.keywords = update_dict["keywords"]
    if "aliases" in update_dict:
        brand.aliases = update_dict["aliases"]

    db.commit()
    db.refresh(brand)
    return brand

@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(brand_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Delete a brand and cascade delete associated official assets, scans, and alerts."""
    brand = owned_brand(db, brand_id, current_user)
    db.delete(brand)
    db.commit()
    return None

# -------------------------------------------------------------
# Secure Logo Upload
# -------------------------------------------------------------

@router.post("/{brand_id}/logo", response_model=BrandResponse)
async def upload_brand_logo(brand_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Securely upload official brand logo, validate image bytes, compute perceptual dHash."""
    brand = owned_brand(db, brand_id, current_user)

    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds 5MB limit.")

    # Validate image header signatures using PIL
    try:
        img = Image.open(io.BytesIO(content))
        img_format = img.format.lower() if img.format else ""
        if img_format not in {"jpeg", "png", "webp", "gif"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: jpeg, png, webp, gif"
            )
        if img.width * img.height > 25_000_000:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image dimensions exceed the 25 megapixel limit.")
        img.verify()
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Corrupted or invalid image file.")

    ext = "jpg" if img_format == "jpeg" else img_format
    filename = f"logo_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    # Compute perceptual dHash for visual similarity comparison
    try:
        brand.logo_hash = calculate_image_hash_from_bytes(content)
    except Exception:
        brand.logo_hash = None

    brand.logo_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(brand)
    return brand

# -------------------------------------------------------------
# Official Asset CRUD Endpoints
# -------------------------------------------------------------

@router.post("/{brand_id}/assets", response_model=OfficialAssetResponse, status_code=status.HTTP_201_CREATED)
def add_official_asset(brand_id: int, asset_in: OfficialAssetCreate, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Add a verified asset to the brand's trusted exclusion registry."""
    brand = owned_brand(db, brand_id, current_user)

    # Prevent duplicate identical identifier on same platform for this brand
    existing_asset = db.query(OfficialAsset).filter(
        OfficialAsset.brand_id == brand_id,
        OfficialAsset.platform == asset_in.platform,
        OfficialAsset.identifier == asset_in.identifier.strip()
    ).first()
    if existing_asset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset with identifier '{asset_in.identifier}' is already registered for this brand."
        )

    asset = OfficialAsset(
        brand_id=brand_id,
        asset_type=asset_in.asset_type,
        platform=asset_in.platform,
        identifier=asset_in.identifier.strip(),
        app_name=asset_in.app_name,
        canonical_url=asset_in.canonical_url,
        publisher_name=asset_in.publisher_name,
        publisher_id=asset_in.publisher_id,
        verified=False,
        notes=asset_in.notes
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

@router.get("/{brand_id}/assets", response_model=List[OfficialAssetResponse])
def list_official_assets(brand_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """List all official assets for a brand."""
    brand = owned_brand(db, brand_id, current_user)
    return brand.official_assets

@router.put("/assets/{asset_id}", response_model=OfficialAssetResponse)
def update_official_asset(asset_id: int, asset_update: OfficialAssetUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Update an official asset record."""
    asset = db.query(OfficialAsset).join(Brand).filter(OfficialAsset.id == asset_id, Brand.user_id == current_user.id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Official asset not found")

    update_dict = asset_update.model_dump(exclude_unset=True)
    # There is no ownership verification workflow yet. Do not let a client mark
    # a self-registered asset as independently verified.
    update_dict.pop("verified", None)
    for field, val in update_dict.items():
        setattr(asset, field, val)

    db.commit()
    db.refresh(asset)
    return asset

@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_official_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    """Delete an official asset from the exclusion registry."""
    asset = db.query(OfficialAsset).join(Brand).filter(OfficialAsset.id == asset_id, Brand.user_id == current_user.id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Official asset not found")
    db.delete(asset)
    db.commit()
    return None
