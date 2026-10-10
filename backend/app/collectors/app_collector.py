import copy
import time
import asyncio
from typing import List, Dict, Any, Optional
from app.collectors.base import BaseCollector, CollectorResult, SourceStatus
from app.collectors.fixtures.synthetic_records import DEMO_APP_CANDIDATES
from app.core.normalization import normalize_text

class AppStoreCollector(BaseCollector):
    """
    Modular App Store Collector (Google Play Store & Apple App Store):
    - Collects mobile applications matching target brand name, package names, and developer metadata
    - Gracefully handles source timeouts, rate limits, and upstream store unavailability
    - Clearly labels demo records (`is_demo=True`)
    """
    def __init__(self, mode: str = "demo", timeout_seconds: float = 5.0, simulate_rate_limit: bool = False, simulate_unavailability: bool = False):
        self.mode = mode
        self.timeout_seconds = timeout_seconds
        self.simulate_rate_limit = simulate_rate_limit
        self.simulate_unavailability = simulate_unavailability

    def get_collector_name(self) -> str:
        return "AppStoreCollector (Google Play & Apple App Store)"

    async def collect(self, brand_name: str, keywords: List[str] = None) -> CollectorResult:
        start_time = time.perf_counter()

        # 1. Graceful handling for store index unavailability
        if self.simulate_unavailability:
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.UNAVAILABLE,
                candidates=[],
                message="App Store scraper and Google Play indexes are temporarily unreachable.",
                error_details="502 Bad Gateway: Upstream marketplace indexer unreachable.",
                is_demo=False,
                duration_ms=duration
            )

        # 2. Graceful handling for rate limits
        if self.simulate_rate_limit:
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.RATE_LIMITED,
                candidates=[],
                message="App Store search query quota exhausted (HTTP 429).",
                error_details="RateLimitExceeded: Marketplace query limit reached.",
                is_demo=False,
                duration_ms=duration
            )

        try:
            target_norm = normalize_text(brand_name)
            candidates = []

            for record in DEMO_APP_CANDIDATES:
                cand = copy.deepcopy(record)
                cand["candidate_name"] = cand["candidate_name"].replace("ApexPay", brand_name)
                cand["candidate_identifier"] = cand["candidate_identifier"].replace("apexpay", target_norm.replace(" ", ""))
                cand["candidate_url"] = cand["candidate_url"].replace("apexpay", target_norm.replace(" ", ""))
                cand["description"] = cand["description"].replace("ApexPay", brand_name)
                cand["is_demo"] = True
                candidates.append(cand)

            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.COMPLETED,
                candidates=candidates,
                message=f"Retrieved {len(candidates)} mobile app candidates across Google Play and iOS App Store indexes.",
                is_demo=True,
                duration_ms=duration
            )
        except asyncio.TimeoutError:
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.TIMEOUT,
                candidates=[],
                message=f"Store search query timed out after {self.timeout_seconds}s.",
                error_details="MarketplaceSearchTimeout",
                is_demo=False,
                duration_ms=duration
            )
        except Exception as e:
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.FAILED,
                candidates=[],
                message=f"App store collection failed: {str(e)}",
                error_details=str(e),
                is_demo=False,
                duration_ms=duration
            )
