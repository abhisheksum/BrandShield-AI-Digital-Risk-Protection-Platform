import pytest
import asyncio
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
