import pytest
import asyncio
import httpx
from app.collectors.base import SourceStatus
from app.collectors.social_collector import SocialCollector
from app.collectors.app_collector import AppStoreCollector

@pytest.mark.asyncio
async def test_social_collector_normal_collection():
    collector = SocialCollector()
    res = await collector.collect("ApexPay")
    assert res.status == SourceStatus.COMPLETED
    assert len(res.candidates) > 0
    assert res.is_demo is True
    assert res.duration_ms is not None
    assert all("apexpay" in c["candidate_name"].lower() or "apexpay" in c["candidate_identifier"].lower() for c in res.candidates)

@pytest.mark.asyncio
async def test_social_collector_graceful_unavailability():
    collector = SocialCollector(simulate_unavailability=True)
    res = await collector.collect("ApexPay")
    assert res.status == SourceStatus.UNAVAILABLE
    assert len(res.candidates) == 0
    assert "unreachable" in res.message.lower()
    assert res.error_details is not None

@pytest.mark.asyncio
async def test_social_collector_graceful_rate_limit():
    collector = SocialCollector(simulate_rate_limit=True)
    res = await collector.collect("ApexPay")
    assert res.status == SourceStatus.RATE_LIMITED
    assert len(res.candidates) == 0
    assert "rate limit" in res.message.lower()
    assert res.error_details is not None


@pytest.mark.asyncio
async def test_social_live_mode_reports_no_provider_without_candidates():
    result = await SocialCollector(mode="live").collect("ApexPay")
    assert result.status == SourceStatus.UNAVAILABLE
    assert result.candidates == []
    assert "no live social platform api" in result.message.lower()

@pytest.mark.asyncio
async def test_app_collector_normal_collection():
    collector = AppStoreCollector()
    res = await collector.collect("ApexPay")
    assert res.status == SourceStatus.COMPLETED
    assert len(res.candidates) > 0
    assert res.is_demo is True
    assert res.duration_ms is not None

@pytest.mark.asyncio
async def test_app_collector_graceful_unavailability():
    collector = AppStoreCollector(simulate_unavailability=True)
    res = await collector.collect("ApexPay")
    assert res.status == SourceStatus.UNAVAILABLE
    assert len(res.candidates) == 0
    assert "unreachable" in res.message.lower()
    assert res.error_details is not None

@pytest.mark.asyncio
async def test_app_collector_graceful_rate_limit():
    collector = AppStoreCollector(simulate_rate_limit=True)
    res = await collector.collect("ApexPay")
    assert res.status == SourceStatus.RATE_LIMITED
    assert len(res.candidates) == 0
    assert "quota" in res.message.lower()
    assert res.error_details is not None


@pytest.mark.asyncio
async def test_apple_search_maps_genuine_results_and_provenance(monkeypatch):
    class Response:
        status_code = 200

        def json(self):
            return {"resultCount": 1, "results": [{
                "trackName": "ApexPay Wallet",
                "trackId": 12345,
                "bundleId": "com.apexpay.wallet",
                "trackViewUrl": "https://apps.apple.com/us/app/apexpay-wallet/id12345",
                "sellerName": "ApexPay Inc.",
                "artistId": 987,
                "artworkUrl100": "https://is1-ssl.mzstatic.com/image.png",
                "description": "Official wallet app",
            }]}

    class FakeClient:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url, params):
            assert url == AppStoreCollector.SEARCH_URL
            assert params["entity"] == "software"
            assert params["term"] == "ApexPay"
            return Response()

    monkeypatch.setattr("app.collectors.app_collector.httpx.AsyncClient", FakeClient)
    result = await AppStoreCollector(mode="live").collect("ApexPay")

    assert result.status == SourceStatus.COMPLETED
    assert result.is_demo is False
    assert len(result.candidates) == 1
    candidate = result.candidates[0]
    assert candidate["candidate_identifier"] == "com.apexpay.wallet"
    assert candidate["candidate_type"] == "mobile_app"
    assert candidate["platform"] == "apple_app_store"
    assert candidate["source_provenance"] == "live"
    assert candidate["source_collector"] == "Apple iTunes Search API"
    assert candidate["is_demo"] is False


@pytest.mark.asyncio
async def test_apple_search_failure_and_timeout_return_no_candidates(monkeypatch):
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
    failed = await AppStoreCollector(mode="live").collect("ApexPay")
    assert failed.status == SourceStatus.UNAVAILABLE
    assert failed.candidates == []

    class TimedOutClient(FailedClient):
        async def get(self, *args, **kwargs):
            raise httpx.ReadTimeout("request timed out")

    monkeypatch.setattr("app.collectors.app_collector.httpx.AsyncClient", TimedOutClient)
    timed_out = await AppStoreCollector(mode="live").collect("ApexPay")
    assert timed_out.status == SourceStatus.TIMEOUT
    assert timed_out.candidates == []
