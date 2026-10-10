import pytest
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_social_monitoring_detection_and_exclusion():
    unique_name = f"SocialShield_{uuid.uuid4().hex[:6]}"
    
    # 1. Register Brand with an official Twitter handle
    brand_res = client.post("/api/brands", json={
        "name": unique_name,
        "industry": "Enterprise Security",
        "official_assets": [
            {
                "asset_type": "social",
                "platform": "twitter",
                "identifier": f"@{unique_name.lower()}",
                "canonical_url": f"https://twitter.com/{unique_name.lower()}",
                "publisher_name": "Official Team",
                "verified": True
            }
        ]
    })
    assert brand_res.status_code == 201
    brand = brand_res.json()
    brand_id = brand["id"]

    # 2. Attempt manual submission of the EXACT registered official handle
    # Rule: Must exclude and reject/exempt official assets without flagging
    official_attempt = client.post("/api/alerts/manual", json={
        "brand_id": brand_id,
        "candidate_name": f"{unique_name} Official",
        "platform": "twitter",
        "candidate_identifier": f"@{unique_name.lower()}",
        "candidate_url": f"https://twitter.com/{unique_name.lower()}"
    })
    assert official_attempt.status_code == 400
    assert "matches a registered official asset" in official_attempt.text

    # 3. Submit a malicious typosquatted candidate with scam trigger words and links
    scam_candidate = client.post("/api/alerts/manual", json={
        "brand_id": brand_id,
        "candidate_name": f"{unique_name} Support Desk",
        "platform": "twitter",
        "candidate_identifier": f"@{unique_name.lower()}_helpdesk",
        "candidate_url": f"https://twitter.com/{unique_name.lower()}_helpdesk",
        "description": "Urgent official customer support helpdesk! Direct message us or click t.me/claim-bonus to verify your wallet.",
        "is_unverified_new_account": True
    })
    assert scam_candidate.status_code == 201
    alert = scam_candidate.json()
    assert alert["risk_score"] >= 65.0
    assert alert["severity"] in ["high", "critical"]
    assert alert["status"] == "new"

    evidence = alert["structured_evidence"]
    assert "name_similarity" in evidence["signals"]
    assert "suspicious_indicators" in evidence["signals"]
    assert any("helpdesk" in r.lower() or "scam" in r.lower() or "t.me" in r.lower() for r in evidence["reasons"])

    # 4. Filter, Search, and Paginate Alerts
    search_resp = client.get(f"/api/alerts/paginated?brand_id={brand_id}&search=helpdesk&page=1&size=5")
    assert search_resp.status_code == 200
    pdata = search_resp.json()
    assert pdata["total"] >= 1
    assert len(pdata["items"]) >= 1

    # 5. CSV Import Connector Test
    csv_content = f"candidate_name,platform,candidate_identifier,candidate_url,description\n{unique_name} Rewards,twitter,@{unique_name.lower()}_rewards,https://twitter.com/{unique_name.lower()}_rewards,Official bonus giveaway claim reward now bit.ly/giveaway\n"
    csv_file = ("candidates.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")
    import_resp = client.post(f"/api/alerts/import-csv?brand_id={brand_id}", files={"file": csv_file})
    assert import_resp.status_code == 201
    assert import_resp.json()["imported"] >= 1

    # Cleanup brand
    client.delete(f"/api/brands/{brand_id}")
