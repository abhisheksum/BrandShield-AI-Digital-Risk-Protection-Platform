import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone

from app.main import app
from app.database import Base, get_db
from app.models.brand import Brand, OfficialAsset
from app.models.alert import Alert

# In-memory test SQLite DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed a target brand
    brand = Brand(
        name="CryptoShield",
        canonical_name="cryptoshield",
        industry="Financial Services",
        description="Secure enterprise crypto treasury and digital wallet infrastructure."
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)

    # Seed an official whitelisted asset
    official = OfficialAsset(
        brand_id=brand.id,
        asset_type="social",
        platform="twitter",
        identifier="@cryptoshield",
        canonical_url="https://twitter.com/cryptoshield",
        verified=True
    )
    db.add(official)
    db.commit()

    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def test_unified_threat_scan_and_exclusion(client):
    # 1. Trigger unified scan (both social and app store)
    response = client.post("/api/scans", json={"brand_id": 1, "scan_type": "all", "use_demo_data": True})
    assert response.status_code == 201
    scan_data = response.json()
    assert scan_data["status"] == "completed"
    assert scan_data["alerts_generated"] > 0

    # 2. Query alerts generated in SQLite
    alerts_res = client.get("/api/alerts?brand_id=1")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) > 0

    # Verify each alert has unified fields
    for alert in alerts:
        assert 0.0 <= alert["risk_score"] <= 100.0
        assert alert["severity"] in ["critical", "high", "medium", "low"]
        assert alert["confidence"] in ["high", "medium", "low"]
        assert alert["recommended_action"] is not None
        assert alert["candidate_type"] in ["social_account", "mobile_app"]
        # Official asset (@cryptoshield) must NEVER be flagged
        assert alert["candidate_identifier"] != "@cryptoshield"
        assert alert["candidate_url"] != "https://twitter.com/cryptoshield"


def test_analyst_investigation_workflow_and_false_positive_dismissal(client):
    # Create a test alert directly
    db = TestingSessionLocal()
    alert = Alert(
        brand_id=1,
        candidate_name="CryptoShield Fake Promo",
        candidate_type="social_account",
        platform="telegram",
        candidate_identifier="@cryptoshield_airdrop",
        candidate_url="https://t.me/cryptoshield_airdrop",
        risk_score=85.0,
        severity="critical",
        confidence="high",
        recommended_action="Initiate immediate takedown",
        structured_evidence='{"reasons": ["Telegram fake airdrop"]}',
        status="new"
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    alert_id = alert.id
    db.close()

    # 1. Analyst changes status to under_investigation with notes
    update_res = client.patch(
        f"/api/alerts/{alert_id}/status",
        json={
            "status": "under_investigation",
            "analyst_name": "Senior SOC Analyst Alpha",
            "investigation_notes": "Verified off-platform redirect to phishing wallet drainer."
        }
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "under_investigation"
    assert updated["analyst_name"] == "Senior SOC Analyst Alpha"
    assert updated["investigation_notes"] == "Verified off-platform redirect to phishing wallet drainer."
    assert updated["status_changed_at"] is not None

    # 2. Analyst dismisses as false_positive
    fp_res = client.patch(
        f"/api/alerts/{alert_id}/status",
        json={
            "status": "false_positive",
            "resolution_notes": "Internal marketing promotion verified through partner registry."
        }
    )
    assert fp_res.status_code == 200
    fp_data = fp_res.json()
    assert fp_data["status"] == "false_positive"
    assert fp_data["dismissed_at"] is not None
    assert fp_data["resolution_notes"] == "Internal marketing promotion verified through partner registry."


def test_unified_threat_center_filters(client):
    # Insert multiple heterogeneous alerts (social, app, critical, medium)
    db = TestingSessionLocal()
    a1 = Alert(
        brand_id=1,
        candidate_name="CryptoShield Android Pro",
        candidate_type="mobile_app",
        platform="google_play",
        candidate_identifier="com.fake.cryptoshield",
        risk_score=92.0,
        severity="critical",
        confidence="high",
        structured_evidence='{}',
        status="new"
    )
    a2 = Alert(
        brand_id=1,
        candidate_name="CryptoShield Twitter News",
        candidate_type="social_account",
        platform="twitter",
        candidate_identifier="@cryptoshield_news",
        risk_score=50.0,
        severity="medium",
        confidence="medium",
        structured_evidence='{}',
        status="under_investigation"
    )
    db.add_all([a1, a2])
    db.commit()
    db.close()

    # Filter by candidate_type
    res_app = client.get("/api/alerts?candidate_type=mobile_app")
    assert res_app.status_code == 200
    apps = res_app.json()
    assert len(apps) >= 1
    assert all(a["candidate_type"] == "mobile_app" for a in apps)

    # Filter by platform
    res_tw = client.get("/api/alerts?platform=twitter")
    assert res_tw.status_code == 200
    twitters = res_tw.json()
    assert len(twitters) >= 1
    assert all("twitter" in a["platform"].lower() for a in twitters)

    # Filter by severity
    res_crit = client.get("/api/alerts?severity=critical")
    assert res_crit.status_code == 200
    crits = res_crit.json()
    assert len(crits) >= 1
    assert all(a["severity"] == "critical" for a in crits)

    # Filter by status
    res_inv = client.get("/api/alerts?status=under_investigation")
    assert res_inv.status_code == 200
    invs = res_inv.json()
    assert len(invs) >= 1
    assert all(a["status"] == "under_investigation" for a in invs)
