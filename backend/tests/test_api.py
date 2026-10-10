import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    for endpoint in ["/health", "/api/health"]:
        response = client.get(endpoint)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "BrandShield AI" in data["service"]

def test_create_and_query_brand():
    unique_name = f"CloudSecure_{uuid.uuid4().hex[:6]}"
    payload = {
        "name": unique_name,
        "industry": "Cybersecurity",
        "description": "Enterprise cloud workload protection and identity detection.",
        "keywords": "cloud, security, identity, sso"
    }
    # Create
    resp = client.post("/api/brands", json=payload)
    assert resp.status_code == 201
    brand_id = resp.json()["id"]

    # Retrieve
    get_resp = client.get(f"/api/brands/{brand_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == unique_name

    # Add Official Asset
    asset_payload = {
        "asset_type": "social",
        "platform": "twitter",
        "identifier": f"@{unique_name.lower()}",
        "canonical_url": f"https://twitter.com/{unique_name.lower()}",
        "verified": True
    }
    asset_resp = client.post(f"/api/brands/{brand_id}/assets", json=asset_payload)
    assert asset_resp.status_code == 201
    assert asset_resp.json()["identifier"] == f"@{unique_name.lower()}"

    # Trigger Scan
    scan_payload = {
        "brand_id": brand_id,
        "scan_type": "all",
        "use_demo_data": True
    }
    scan_resp = client.post("/api/scans", json=scan_payload)
    assert scan_resp.status_code == 201
    scan_data = scan_resp.json()
    assert scan_data["status"] == "completed"
    assert scan_data["total_candidates"] > 0

    # Query Alerts
    alerts_resp = client.get(f"/api/alerts?brand_id={brand_id}")
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    assert len(alerts) > 0

    # Test status update on alert
    first_alert_id = alerts[0]["id"]
    patch_resp = client.patch(
        f"/api/alerts/{first_alert_id}/status",
        json={"status": "under_investigation", "resolution_notes": "Assigned to SOC analyst"}
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "under_investigation"

def test_duplicate_brand_error():
    payload = {
        "name": f"DuplicateTest_{uuid.uuid4().hex[:6]}",
        "industry": "Retail"
    }
    resp1 = client.post("/api/brands", json=payload)
    assert resp1.status_code == 201
    resp2 = client.post("/api/brands", json=payload)
    assert resp2.status_code == 400
    assert "already registered" in resp2.json()["detail"]
