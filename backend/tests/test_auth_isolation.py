import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import require_auth
from app.main import app
from app.database import Base, get_db
from app.models.user import User


test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def isolated_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.pop(get_db, None)


def test_registration_login_and_organisation_isolation(isolated_database):
    # Remove the shared legacy-test auth override for this security test.
    app.dependency_overrides.pop(require_auth, None)
    client = TestClient(app)
    suffix = uuid.uuid4().hex[:10]
    accounts = []
    emails = []

    for label in ("one", "two"):
        payload = {
            "email": f"{label}-{suffix}@example.test",
            "organisation_name": f"Organisation {label} {suffix}",
            "password": "a-long-test-password",
        }
        registered = client.post("/api/auth/register", json=payload)
        assert registered.status_code == 201, registered.text
        assert "hashed_password" not in registered.json()["user"]
        accounts.append((payload, registered.json()["access_token"]))
        emails.append(payload["email"])

    db = TestingSessionLocal()
    stored_user = db.query(User).filter(User.email == emails[0]).one()
    assert stored_user.hashed_password != accounts[0][0]["password"]
    assert len(stored_user.hashed_password) > 50
    db.close()

    first_payload, first_token = accounts[0]
    login = client.post("/api/auth/login", json={
        "email": first_payload["email"], "password": first_payload["password"]
    })
    assert login.status_code == 200
    assert login.json()["access_token"]

    created = client.post(
        "/api/brands",
        json={"name": f"ApexFintech Private {suffix}", "official_assets": [{
            "asset_type": "social",
            "platform": "twitter",
            "identifier": f"@private_{suffix}",
        }]},
        headers={"Authorization": f"Bearer {first_token}"},
    )
    assert created.status_code == 201, created.text
    brand_id = created.json()["id"]

    candidate = client.post(
        "/api/alerts/manual",
        json={
            "brand_id": brand_id,
            "candidate_name": f"ApexFintech Private {suffix} Support",
            "platform": "twitter",
            "candidate_identifier": f"@private_{suffix}_support",
            "candidate_url": f"https://x.com/private_{suffix}_support",
            "description": "Urgent account verification, claim reward now at bit.ly/private-verify",
            "is_unverified_new_account": True,
        },
        headers={"Authorization": f"Bearer {first_token}"},
    )
    assert candidate.status_code == 201, candidate.text
    alert_id = candidate.json()["id"]
    scan = client.post(
        "/api/scans",
        json={"brand_id": brand_id, "scan_type": "social", "use_demo_data": False},
        headers={"Authorization": f"Bearer {first_token}"},
    )
    assert scan.status_code == 201

    second_token = accounts[1][1]
    denied = client.get(
        f"/api/brands/{brand_id}",
        headers={"Authorization": f"Bearer {second_token}"},
    )
    assert denied.status_code == 404
    assert client.get(
        f"/api/brands/{brand_id}/assets",
        headers={"Authorization": f"Bearer {second_token}"},
    ).status_code == 404
    assert client.get(
        f"/api/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {second_token}"},
    ).status_code == 404
    private_scans = client.get(
        "/api/scans",
        headers={"Authorization": f"Bearer {second_token}"},
    )
    assert private_scans.status_code == 200
    assert all(item["brand_id"] != brand_id for item in private_scans.json())
    visible = client.get("/api/brands", headers={"Authorization": f"Bearer {second_token}"})
    assert all(brand["id"] != brand_id for brand in visible.json())

    assert client.get("/api/brands").status_code == 401
