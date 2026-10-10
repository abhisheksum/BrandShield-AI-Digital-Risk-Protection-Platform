import pytest
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_brand_full_crud():
    unique_suffix = uuid.uuid4().hex[:6]
    brand_name = f"RedShield Corp {unique_suffix}"
    
    # 1. CREATE Brand with multiple embedded official assets
    create_payload = {
        "name": brand_name,
        "website": "https://redshield.example.com",
        "industry": "Cybersecurity & Risk Intelligence",
        "description": "Enterprise brand impersonation protection.",
        "keywords": "redshield, defense, risk",
        "aliases": "Red Shield, RS Defense",
        "official_assets": [
            {
                "asset_type": "social",
                "platform": "twitter",
                "identifier": f"@redshield_{unique_suffix}",
                "canonical_url": f"https://twitter.com/redshield_{unique_suffix}",
                "publisher_name": "RedShield Global Inc.",
                "verified": True,
                "notes": "Verified corporate Twitter handle"
            },
            {
                "asset_type": "mobile_app",
                "platform": "google_play",
                "identifier": f"com.redshield.auth.{unique_suffix}",
                "app_name": "RedShield Authenticator",
                "canonical_url": f"https://play.google.com/store/apps/details?id=com.redshield.auth.{unique_suffix}",
                "publisher_name": "RedShield Global Inc.",
                "verified": True,
                "notes": "Official 2FA app on Google Play"
            }
        ]
    }
    create_resp = client.post("/api/brands", json=create_payload)
    assert create_resp.status_code == 201, create_resp.text
    created = create_resp.json()
    brand_id = created["id"]
    assert created["name"] == brand_name
    assert created["website"] == "https://redshield.example.com"
    assert created["aliases"] == "Red Shield, RS Defense"
    assert len(created["official_assets"]) == 2

    from app.core.normalization import normalize_text
    # 2. READ Brand (Single & List)
    get_resp = client.get(f"/api/brands/{brand_id}")
    assert get_resp.status_code == 200
    brand_data = get_resp.json()
    assert brand_data["name"] == brand_name
    assert brand_data["canonical_name"] == normalize_text(brand_name)

    list_resp = client.get("/api/brands")
    assert list_resp.status_code == 200
    all_brands = list_resp.json()
    assert any(b["id"] == brand_id for b in all_brands)

    # 3. UPDATE Brand metadata
    update_payload = {
        "website": "https://portal.redshield.example.com",
        "description": "Updated enterprise description with expanded scope.",
        "aliases": "RedShield Global, Red Shield Security"
    }
    update_resp = client.put(f"/api/brands/{brand_id}", json=update_payload)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["website"] == "https://portal.redshield.example.com"
    assert updated_data["aliases"] == "RedShield Global, Red Shield Security"

    # 4. ADD & UPDATE & DELETE Individual Official Assets
    new_asset_payload = {
        "asset_type": "social",
        "platform": "instagram",
        "identifier": f"redshield_{unique_suffix}",
        "canonical_url": f"https://instagram.com/redshield_{unique_suffix}",
        "publisher_name": "RedShield Global Inc.",
        "verified": True
    }
    asset_resp = client.post(f"/api/brands/{brand_id}/assets", json=new_asset_payload)
    assert asset_resp.status_code == 201
    asset_id = asset_resp.json()["id"]

    # Update asset
    patch_asset_resp = client.put(f"/api/brands/assets/{asset_id}", json={
        "notes": "Verified corporate Instagram profile",
        "app_name": "RedShield Instagram"
    })
    assert patch_asset_resp.status_code == 200
    assert patch_asset_resp.json()["notes"] == "Verified corporate Instagram profile"

    # Delete asset
    del_asset_resp = client.delete(f"/api/brands/assets/{asset_id}")
    assert del_asset_resp.status_code == 204

    # 5. SECURE LOGO UPLOAD
    from PIL import Image
    buf = io.BytesIO()
    test_img = Image.new("RGBA", (64, 64), color="blue")
    test_img.save(buf, format="PNG")
    buf.seek(0)
    logo_file = ("logo.png", buf, "image/png")
    upload_resp = client.post(f"/api/brands/{brand_id}/logo", files={"file": logo_file})
    assert upload_resp.status_code == 200, upload_resp.text
    logo_data = upload_resp.json()
    assert logo_data["logo_url"].startswith("/uploads/")
    assert logo_data["logo_hash"] is not None

    # Invalid file type test
    invalid_file = ("script.exe", io.BytesIO(b"MZ\x90\x00binarycontent"), "application/octet-stream")
    bad_upload_resp = client.post(f"/api/brands/{brand_id}/logo", files={"file": invalid_file})
    assert bad_upload_resp.status_code == 400

    # 6. DELETE Brand (Cascade check)
    del_brand_resp = client.delete(f"/api/brands/{brand_id}")
    assert del_brand_resp.status_code == 204

    # Verify not found after deletion
    check_deleted = client.get(f"/api/brands/{brand_id}")
    assert check_deleted.status_code == 404

def test_url_validation_rejection():
    bad_payload = {
        "name": f"BadURLBrand_{uuid.uuid4().hex[:6]}",
        "website": "not-a-valid-url"
    }
    resp = client.post("/api/brands", json=bad_payload)
    assert resp.status_code == 422  # Pydantic validation error
