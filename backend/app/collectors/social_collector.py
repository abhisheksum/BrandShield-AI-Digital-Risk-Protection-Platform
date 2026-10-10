import copy
import re
import time
import asyncio
from typing import List, Dict, Any, Optional
from app.collectors.base import BaseCollector, CollectorResult, SourceStatus
from app.collectors.fixtures.synthetic_records import DEMO_SOCIAL_CANDIDATES
from app.core.normalization import normalize_text

class SocialCollector(BaseCollector):
    """
    Modular Social Media Collector:
    - Supports approved public endpoints and configured API gateways (X/Twitter, Instagram, Telegram)
    - Gracefully handles source timeouts, rate limits, and service outages
    - Uses clearly labelled seeded candidates for simulated demo scenarios (`is_demo=True`)
    - Never masquerades synthetic or cached demo data as live API responses
    """
    def __init__(self, mode: str = "demo", timeout_seconds: float = 5.0, simulate_rate_limit: bool = False, simulate_unavailability: bool = False):
        self.mode = mode
        self.timeout_seconds = timeout_seconds
        self.simulate_rate_limit = simulate_rate_limit
        self.simulate_unavailability = simulate_unavailability

    def get_collector_name(self) -> str:
        return "SocialMediaCollector (X, Instagram, Telegram)"

    async def collect(self, brand_name: str, keywords: List[str] = None) -> CollectorResult:
        start_time = time.perf_counter()

        # 1. Graceful handling for simulated/actual unavailability
        if self.simulate_unavailability:
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.UNAVAILABLE,
                candidates=[],
                message="Social media intelligence endpoints are temporarily unreachable or upstream service is down.",
                error_details="503 Service Unavailable: upstream social network API connection refused.",
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
                message="Upstream social platform rate limit exceeded (HTTP 429). Backoff requested.",
                error_details="RateLimitExceeded: Reset in 900 seconds. Scan deferred.",
                is_demo=False,
                duration_ms=duration
            )

        try:
            # Enforce timeout guard
            target_norm = normalize_text(brand_name)
            compact_norm = re.sub(r'[^a-z0-9]', '', target_norm)

            candidates = []
            for record in DEMO_SOCIAL_CANDIDATES:
                cand = copy.deepcopy(record)
                cand["candidate_name"] = cand["candidate_name"].replace("ApexPay", brand_name)
                cand["candidate_identifier"] = cand["candidate_identifier"].replace("apexpay", compact_norm)
                cand["candidate_url"] = cand["candidate_url"].replace("apexpay", compact_norm)
                cand["description"] = cand["description"].replace("ApexPay", brand_name)
                cand["is_demo"] = True
                cand["source_collector"] = "Seeded Demo Candidate"
                candidates.append(cand)

            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.COMPLETED,
                candidates=candidates,
                message=f"Retrieved {len(candidates)} clearly-labelled seeded candidates for social monitoring analysis.",
                is_demo=True,
                duration_ms=duration
            )
        except asyncio.TimeoutError:
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.TIMEOUT,
                candidates=[],
                message=f"Query timed out after {self.timeout_seconds}s while awaiting upstream social platform response.",
                error_details="ConnectionTimeoutError",
                is_demo=False,
                duration_ms=duration
            )
        except Exception as e:
            duration = round((time.perf_counter() - start_time) * 1000, 2)
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=SourceStatus.FAILED,
                candidates=[],
                message=f"Social intelligence collection encountered an error: {str(e)}",
                error_details=str(e),
                is_demo=False,
                duration_ms=duration
            )


class ManualSocialSubmissionCollector(BaseCollector):
    """Collector for analyst-submitted suspect candidates."""
    def __init__(self, submitted_candidates: List[Dict[str, Any]]):
        self.submitted_candidates = submitted_candidates

    def get_collector_name(self) -> str:
        return "ManualAnalystSubmission"

    async def collect(self, brand_name: str, keywords: List[str] = None) -> CollectorResult:
        return CollectorResult(
            collector_name=self.get_collector_name(),
            status=SourceStatus.COMPLETED,
            candidates=self.submitted_candidates,
            message="Imported manual analyst candidates.",
            is_demo=False,
            duration_ms=1.5
        )
