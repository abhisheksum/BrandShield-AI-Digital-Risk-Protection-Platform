import pytest
from app.models.brand import OfficialAsset
from app.core.exclusion import is_official_asset

def test_canonical_url_exclusion():
    asset = OfficialAsset(
        id=1,
        brand_id=1,
        asset_type="social",
        platform="twitter",
        identifier="@apexpay",
        canonical_url="https://twitter.com/apexpay",
        verified=True
    )
    
    # Matching candidate URL with trailing slash and query param differences
    candidate = {
        "candidate_name": "ApexPay Official",
        "candidate_type": "social_account",
        "platform": "twitter",
        "candidate_url": "https://www.twitter.com/apexpay/",
        "candidate_identifier": "@apexpay"
    }
    assert is_official_asset(candidate, [asset]) is True

def test_mobile_app_package_exclusion():
    asset = OfficialAsset(
        id=2,
        brand_id=1,
        asset_type="mobile_app",
        platform="google_play",
        identifier="com.apexpay.wallet",
        canonical_url="https://play.google.com/store/apps/details?id=com.apexpay.wallet",
        publisher_name="ApexPay Inc.",
        verified=True
    )
    
    # Official app candidate
    candidate = {
        "candidate_name": "ApexPay Wallet & Cards",
        "candidate_type": "mobile_app",
        "platform": "google_play",
        "candidate_identifier": "com.apexpay.wallet",
        "publisher_name": "ApexPay Inc."
    }
    assert is_official_asset(candidate, [asset]) is True

    # Rogue app with lookalike name but different package id
    rogue_candidate = {
        "candidate_name": "ApexPay Wallet & Cards",
        "candidate_type": "mobile_app",
        "platform": "google_play",
        "candidate_identifier": "com.fake.apexpay.wallet",
        "publisher_name": "Rogue Developer"
    }
    assert is_official_asset(rogue_candidate, [asset]) is False


def test_shared_publisher_does_not_exclude_a_different_app_package():
    asset = OfficialAsset(
        id=3,
        brand_id=1,
        asset_type="mobile_app",
        platform="apple_app_store",
        identifier="com.apexpay.wallet",
        publisher_name="ApexPay Inc.",
    )
    unrelated_package = {
        "candidate_name": "Another ApexPay App",
        "candidate_type": "mobile_app",
        "platform": "apple_app_store",
        "candidate_identifier": "com.other.developer.calendar",
        "publisher_name": "ApexPay Inc.",
    }
    assert is_official_asset(unrelated_package, [asset]) is False
