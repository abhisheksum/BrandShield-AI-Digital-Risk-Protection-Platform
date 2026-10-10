import pytest
import uuid
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.brand import Brand, OfficialAsset
from app.models.alert import Alert
from app.models.scan import Scan
from app.core.scoring import calculate_explainable_risk_score
from app.collectors.base import SourceStatus
from app.collectors.social_collector import SocialCollector
from app.collectors.app_collector import AppStoreCollector

# In-memory test SQLite DB for deterministic validation
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
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def test_hackathon_flow_1_register_fictional_brand_with_official_assets(client):
    """
    Verification (1):
    Register a fictional brand 'ApexFintech' with official assets:
    - Official website
    - Official verified Twitter handle
    - Official Google Play mobile app package ID
    """
    create_payload = {
        "name": "ApexFintech",
        "website": "https://apexfintech.example.com",
        "industry": "Decentralized Finance & Payments",
        "description": "Secure enterprise wallet and automated cross-border settlement infrastructure.",
        "keywords": "wallet, payments, apexfintech, crypto, defi",
        "aliases": "Apex Fintech, Apex Fin",
        "official_assets": [
            {
                "asset_type": "social",
                "platform": "twitter",
                "identifier": "@apexfintech",
                "canonical_url": "https://twitter.com/apexfintech",
                "publisher_name": "ApexFintech Global Ltd.",
                "verified": True,
                "notes": "Verified primary corporate account"
            },
            {
                "asset_type": "mobile_app",
                "platform": "google_play",
                "identifier": "com.apexfintech.wallet",
                "app_name": "ApexFintech Wallet",
                "canonical_url": "https://play.google.com/store/apps/details?id=com.apexfintech.wallet",
                "publisher_name": "ApexFintech Technologies Inc.",
                "verified": True,
                "notes": "Verified official mobile banking app"
            }
        ]
    }

    res = client.post("/api/brands", json=create_payload)
    assert res.status_code == 201
    brand_data = res.json()
    assert brand_data["name"] == "ApexFintech"
    assert len(brand_data["official_assets"]) == 2
    assert brand_data["canonical_name"] == "apexfintech"

    # Query back to verify persistence
    get_res = client.get(f"/api/brands/{brand_data['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "ApexFintech"


def test_hackathon_flow_2_social_scan_exclusions_and_lookalikes(client):
    """
    Verification (2):
    Social scan:
    - Excludes official registered account (@apexfintech)
    - Detects seeded look-alike with suspicious added words ('ApexFintech Official Support', bit.ly redirect)
    - Avoids unrelated false positives
    """
    # 1. Create Brand with official Twitter handle
    brand_res = client.post("/api/brands", json={
        "name": "ApexFintech",
        "official_assets": [
            {
                "asset_type": "social",
                "platform": "twitter",
                "identifier": "@apexfintech",
                "canonical_url": "https://twitter.com/apexfintech",
                "verified": True
            }
        ]
    })
    brand_id = brand_res.json()["id"]

    # 2. Trigger Social Scan
    scan_res = client.post("/api/scans", json={
        "brand_id": brand_id,
        "scan_type": "social",
        "use_demo_data": True
    })
    assert scan_res.status_code == 201
    scan_data = scan_res.json()
    assert scan_data["status"] == "completed"

    # 3. Inspect generated alerts
    alerts_res = client.get(f"/api/alerts?brand_id={brand_id}")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()

    # The official account MUST NOT be present in alerts
    for a in alerts:
        assert a["candidate_identifier"] != "@apexfintech"
        assert a["candidate_url"] != "https://twitter.com/apexfintech"

    # Must detect look-alike account with suspicious added words
    support_alert = next((a for a in alerts if "support" in a["candidate_identifier"].lower() or "support" in a["candidate_name"].lower()), None)
    assert support_alert is not None
    assert support_alert["risk_score"] >= 65.0
    evidence = support_alert["structured_evidence"]
    assert any("trigger words" in r.lower() or "resemblance" in r.lower() or "redirect" in r.lower() for r in evidence.get("reasons", []))

    # Test an unrelated candidate to verify false positive suppression
    unrelated_cand = {
        "candidate_name": "Acme Weather Forecast",
        "candidate_identifier": "@acme_weather",
        "candidate_type": "social_account",
        "platform": "twitter",
        "description": "Daily meteorological forecasts and Doppler radar updates."
    }
    unrelated_res = calculate_explainable_risk_score(
        {"name": "ApexFintech", "description": "Wallet and fintech"},
        unrelated_cand
    )
    # Unrelated candidate must score low and not trigger critical/high alerts
    assert unrelated_res["score"] < 40.0
    assert unrelated_res["severity"] == "low"


def test_hackathon_flow_3_app_scan_exclusions_and_publisher_mismatch(client):
    """
    Verification (3):
    App store scan:
    - Excludes official app ('com.apexfintech.mobile')
    - Tests look-alike publisher with similar description ('com.quickloans.apexfintech.wallet', publisher 'Fast Fintech Labs LLC')
    - Avoids flagging unrelated apps
    """
    brand_res = client.post("/api/brands", json={
        "name": "ApexFintech",
        "official_assets": [
            {
                "asset_type": "mobile_app",
                "platform": "google_play",
                "identifier": "com.apexfintech.mobile",
                "canonical_url": "https://play.google.com/store/apps/details?id=com.apexfintech.mobile",
                "publisher_name": "ApexFintech Technologies Inc.",
                "verified": True
            }
        ]
    })
    brand_id = brand_res.json()["id"]

    # Trigger App Store scan
    scan_res = client.post("/api/scans", json={
        "brand_id": brand_id,
        "scan_type": "app_store",
        "use_demo_data": True
    })
    assert scan_res.status_code == 201

    alerts_res = client.get(f"/api/alerts?brand_id={brand_id}&candidate_type=mobile_app")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()

    # Official package ID must NOT be flagged
    for a in alerts:
        assert a["candidate_identifier"] != "com.apexfintech.mobile"

    # Look-alike app with rogue publisher ('Fast Fintech Labs LLC') must be flagged
    rogue_app = next((a for a in alerts if "quickloans" in (a["candidate_identifier"] or "").lower()), None)
    assert rogue_app is not None
    assert rogue_app["risk_score"] >= 65.0
    evidence = rogue_app["structured_evidence"]
    assert any("identity conflict" in r.lower() or "unverified" in r.lower() or "resemblance" in r.lower() for r in evidence.get("reasons", []))

    # Verify unrelated mobile app does not trigger high risk
    unrelated_app = {
        "candidate_name": "Sudoku Master Puzzle",
        "candidate_identifier": "com.games.sudokupuzzle",
        "candidate_type": "mobile_app",
        "platform": "google_play",
        "publisher_name": "Puzzle Studio Inc",
        "description": "Brain teaser puzzle grid game with thousands of levels."
    }
    unrelated_scoring = calculate_explainable_risk_score(
        {"name": "ApexFintech", "description": "Wallet and fintech"},
        unrelated_app
    )
    assert unrelated_scoring["score"] < 40.0
    assert unrelated_scoring["severity"] == "low"


def test_hackathon_flow_4_analyst_investigation_and_persistence_after_refresh(client):
    """
    Verification (4):
    Investigate a detection:
    - Change status to under_investigation, confirmed_impersonation, takedown_requested, or false_positive
    - Add analyst name and detailed investigation notes
    - Verify persistence across independent database queries / simulate browser refresh
    """
    db = TestingSessionLocal()
    brand = Brand(user_id=1, name="ApexFintech", canonical_name="apexfintech")
    db.add(brand)
    db.commit()

    alert = Alert(
        brand_id=brand.id,
        candidate_name="ApexFintech Support Desk",
        candidate_type="social_account",
        platform="twitter",
        candidate_identifier="@apexfintech_desk",
        candidate_url="https://twitter.com/apexfintech_desk",
        risk_score=78.5,
        severity="high",
        confidence="high",
        structured_evidence=json.dumps({"reasons": ["Urgent wallet unlock link bit.ly/apex-claim"]}),
        status="new"
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    alert_id = alert.id
    db.close()

    # Step A: Update status and add investigation notes
    patch_payload = {
        "status": "under_investigation",
        "analyst_name": "Security Analyst Jane Doe",
        "investigation_notes": "Identified C2 domain in profile bio. Initiated DNS lookup and registrar abuse report."
    }
    update_res = client.patch(f"/api/alerts/{alert_id}/status", json=patch_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["status"] == "under_investigation"
    assert updated_data["analyst_name"] == "Security Analyst Jane Doe"
    assert "C2 domain" in updated_data["investigation_notes"]

    # Step B: Simulate page refresh by querying the fresh database session
    db_verify = TestingSessionLocal()
    reloaded_alert = db_verify.query(Alert).filter(Alert.id == alert_id).first()
    assert reloaded_alert is not None
    assert reloaded_alert.status == "under_investigation"
    assert reloaded_alert.analyst_name == "Security Analyst Jane Doe"
    assert "C2 domain" in reloaded_alert.investigation_notes
    assert reloaded_alert.status_changed_at is not None
    db_verify.close()

    # Step C: Escalate to takedown_requested
    takedown_res = client.patch(f"/api/alerts/{alert_id}/status", json={
        "status": "takedown_requested",
        "resolution_notes": "Submitted formal DMCA takedown request to Twitter Trust & Safety."
    })
    assert takedown_res.status_code == 200
    assert takedown_res.json()["status"] == "takedown_requested"


def test_hackathon_flow_5_simulate_unavailable_external_source(client):
    """
    Verification (5):
    Simulate unavailable external source (outage / 503 / timeout / rate-limit):
    - Verify graceful failure (SourceStatus.UNAVAILABLE or RATE_LIMITED)
    - Verify overall scan marks status as 'partial' or 'failed'
    - Verify ZERO fabricated or invented results are presented
    """
    # Test social collector when upstream is down
    collector = SocialCollector(simulate_unavailability=True)
    import asyncio
    res = asyncio.run(collector.collect("ApexFintech"))

    assert res.status == SourceStatus.UNAVAILABLE
    # Must NOT fabricate candidates
    assert len(res.candidates) == 0
    assert "unreachable" in res.message.lower()

    # Test rate limit simulation
    rl_collector = AppStoreCollector(simulate_rate_limit=True)
    rl_res = asyncio.run(rl_collector.collect("ApexFintech"))
    assert rl_res.status == SourceStatus.RATE_LIMITED
    assert len(rl_res.candidates) == 0
    assert "quota" in rl_res.message.lower()


def test_live_apple_scan_excludes_official_app_deduplicates_and_persists_investigation(client, monkeypatch):
    """Exercise registered asset -> live provider -> exclusion -> finding -> investigation."""
    class Response:
        status_code = 200

        def json(self):
            return {"resultCount": 2, "results": [
                {
                    "trackName": "ApexFintech Wallet",
                    "trackId": 101,
                    "bundleId": "com.apexfintech.wallet",
                    "trackViewUrl": "https://apps.apple.com/us/app/apexfintech-wallet/id101",
                    "sellerName": "ApexFintech Inc.",
                    "description": "Secure payments and wallet access.",
                },
                {
                    "trackName": "ApexFintech Secure Wallet Support",
                    "trackId": 202,
                    "bundleId": "com.quickloan.apexfintech.support",
                    "trackViewUrl": "https://apps.apple.com/us/app/quickloan-support/id202",
                    "sellerName": "QuickLoan Holdings",
                    "description": "Urgent account verification and wallet recovery support. Claim funds now at bit.ly/verify-apex",
                },
            ]}

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, *args, **kwargs):
            return Response()

    monkeypatch.setattr("app.collectors.app_collector.httpx.AsyncClient", FakeClient)
    created = client.post("/api/brands", json={
        "name": "ApexFintech",
        "description": "Secure enterprise wallet and cross-border payments.",
        "official_assets": [{
            "asset_type": "mobile_app",
            "platform": "apple_app_store",
            "identifier": "com.apexfintech.wallet",
            "canonical_url": "https://apps.apple.com/us/app/apexfintech-wallet/id101",
            "publisher_name": "ApexFintech Inc.",
        }],
    })
    assert created.status_code == 201, created.text
    brand_id = created.json()["id"]

    first_scan = client.post("/api/scans", json={
        "brand_id": brand_id,
        "scan_type": "app_store",
        "use_demo_data": False,
    })
    assert first_scan.status_code == 201, first_scan.text
    scan_data = first_scan.json()
    assert scan_data["status"] == "completed"
    assert scan_data["is_demo"] == 0
    assert scan_data["total_candidates"] == 2
    assert scan_data["alerts_generated"] == 1
    apple_source = scan_data["source_summary"]["Apple iTunes Search API"]
    assert apple_source["status"] == "completed"
    assert apple_source["is_demo"] is False
    assert "Google Play" in apple_source["message"]

    alerts_response = client.get(f"/api/alerts?brand_id={brand_id}&candidate_type=mobile_app")
    alerts = alerts_response.json()
    assert len(alerts) == 1
    finding = alerts[0]
    assert finding["candidate_identifier"] == "com.quickloan.apexfintech.support"
    assert finding["is_demo"] == 0
    assert finding["structured_evidence"]["source_type"] == "live_source"
    assert finding["structured_evidence"]["source_collector"] == "Apple iTunes Search API"
    assert finding["structured_evidence"]["signals"]["logo_similarity"]["available"] is False

    second_scan = client.post("/api/scans", json={
        "brand_id": brand_id,
        "scan_type": "app_store",
        "use_demo_data": False,
    })
    assert second_scan.status_code == 201
    assert second_scan.json()["alerts_generated"] == 0
    assert len(client.get(f"/api/alerts?brand_id={brand_id}").json()) == 1

    investigated = client.patch(f"/api/alerts/{finding['id']}/status", json={
        "status": "under_investigation",
        "analyst_name": "Analyst One",
        "investigation_notes": "Confirmed app package is not registered as an official asset.",
    })
    assert investigated.status_code == 200
    db = TestingSessionLocal()
    persisted = db.query(Alert).filter(Alert.id == finding["id"]).one()
    assert persisted.status == "under_investigation"
    assert persisted.analyst_name == "Analyst One"
    db.close()


def test_live_scan_source_failure_is_recorded_without_fabricated_findings(client, monkeypatch):
    class Response:
        status_code = 503

    class FailedClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, *args, **kwargs):
            return Response()

    monkeypatch.setattr("app.collectors.app_collector.httpx.AsyncClient", FailedClient)
    brand = client.post("/api/brands", json={"name": "FailureTestBrand"}).json()
    scan = client.post("/api/scans", json={
        "brand_id": brand["id"],
        "scan_type": "app_store",
        "use_demo_data": False,
    })
    assert scan.status_code == 201
    assert scan.json()["status"] == "failed"
    assert scan.json()["total_candidates"] == 0
    assert scan.json()["alerts_generated"] == 0
    assert scan.json()["source_summary"]["Apple iTunes Search API"]["status"] == "unavailable"
