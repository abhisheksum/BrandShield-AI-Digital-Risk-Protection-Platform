import asyncio
import copy
import time
from typing import Any, Dict, List, Optional

import httpx

from app.collectors.base import BaseCollector, CollectorResult, SourceStatus
from app.collectors.fixtures.synthetic_records import DEMO_APP_CANDIDATES
from app.config import settings
from app.core.normalization import normalize_text


class AppStoreCollector(BaseCollector):
    """Apple App Store search and explicitly synthetic demo candidates.

    Live searches use Apple's public iTunes Search API. This provider does not
    search Google Play or claim coverage of every app marketplace.
    """

    SEARCH_URL = "https://itunes.apple.com/search"

    def __init__(
        self,
        mode: str = "demo",
        timeout_seconds: Optional[float] = None,
        simulate_rate_limit: bool = False,
        simulate_unavailability: bool = False,
    ):
        self.mode = mode
        self.timeout_seconds = timeout_seconds or settings.APPLE_STORE_TIMEOUT_SECONDS
        self.country = settings.APPLE_STORE_COUNTRY
        self.result_limit = settings.APPLE_STORE_RESULT_LIMIT
        self.simulate_rate_limit = simulate_rate_limit
        self.simulate_unavailability = simulate_unavailability

    def get_collector_name(self) -> str:
        return "DemoAppStoreCollector" if self.mode == "demo" else "Apple iTunes Search API"

    async def collect(self, brand_name: str, keywords: List[str] = None) -> CollectorResult:
        started = time.perf_counter()

        def result(status, candidates, message, *, is_demo=False, error_details=None):
            return CollectorResult(
                collector_name=self.get_collector_name(),
                status=status,
                candidates=candidates,
                message=message,
                is_demo=is_demo,
                error_details=error_details,
                duration_ms=round((time.perf_counter() - started) * 1000, 2),
            )

        if self.simulate_unavailability:
            return result(SourceStatus.UNAVAILABLE, [], "Apple App Store search is unreachable and temporarily unavailable.", error_details="Simulated upstream failure")
        if self.simulate_rate_limit:
            return result(SourceStatus.RATE_LIMITED, [], "Apple App Store search quota was reached (HTTP 429).", error_details="Simulated HTTP 429")

        if self.mode == "demo":
            target_norm = normalize_text(brand_name)
            try:
                candidates = []
                for record in DEMO_APP_CANDIDATES:
                    candidate = copy.deepcopy(record)
                    candidate["candidate_name"] = candidate["candidate_name"].replace("ApexPay", brand_name)
                    candidate["candidate_identifier"] = candidate["candidate_identifier"].replace("apexpay", target_norm.replace(" ", ""))
                    candidate["candidate_url"] = candidate["candidate_url"].replace("apexpay", target_norm.replace(" ", ""))
                    candidate["description"] = candidate["description"].replace("ApexPay", brand_name)
                    candidate["is_demo"] = True
                    candidate["source_provenance"] = "demo"
                    candidate["source_collector"] = self.get_collector_name()
                    candidates.append(candidate)
                return result(
                    SourceStatus.COMPLETED,
                    candidates,
                    f"Returned {len(candidates)} synthetic demo app candidates. These are not live store results.",
                    is_demo=True,
                )
            except Exception as exc:
                return result(SourceStatus.FAILED, [], "Demo app candidate preparation failed.", error_details=str(exc))

        if self.mode != "live":
            return result(SourceStatus.FAILED, [], "Unknown app-store collection mode.", error_details=f"Unsupported mode: {self.mode}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds, follow_redirects=True) as client:
                response = await client.get(
                    self.SEARCH_URL,
                    params={
                        "term": brand_name,
                        "country": self.country,
                        "entity": "software",
                        "limit": self.result_limit,
                    },
                )

            if response.status_code == 429:
                return result(SourceStatus.RATE_LIMITED, [], "Apple App Store search quota was reached (HTTP 429).", error_details="HTTP 429")
            if response.status_code >= 500:
                return result(SourceStatus.UNAVAILABLE, [], "Apple App Store search is unreachable and temporarily unavailable.", error_details=f"HTTP {response.status_code}")
            if response.status_code >= 400:
                return result(SourceStatus.FAILED, [], "Apple App Store rejected the search request.", error_details=f"HTTP {response.status_code}")

            payload = response.json()
            records = payload.get("results") if isinstance(payload, dict) else None
            if not isinstance(records, list):
                return result(SourceStatus.FAILED, [], "Apple returned an unexpected search response.", error_details="Missing results array")

            candidates = []
            for record in records:
                if not isinstance(record, dict) or not record.get("trackName"):
                    continue
                track_id = record.get("trackId")
                bundle_id = record.get("bundleId")
                candidates.append({
                    "candidate_name": str(record["trackName"]),
                    "candidate_type": "mobile_app",
                    "platform": "apple_app_store",
                    "candidate_identifier": str(bundle_id or (f"apple:{track_id}" if track_id else "")) or None,
                    "candidate_url": record.get("trackViewUrl"),
                    "publisher_name": record.get("sellerName"),
                    "publisher_id": str(record.get("artistId")) if record.get("artistId") is not None else None,
                    "logo_url": record.get("artworkUrl100") or record.get("artworkUrl60"),
                    "description": record.get("description"),
                    "is_demo": False,
                    "source_provenance": "live",
                    "source_collector": self.get_collector_name(),
                })

            return result(
                SourceStatus.COMPLETED,
                candidates,
                f"Apple returned {len(candidates)} live App Store search results for country '{self.country}'. This does not include Google Play or other stores.",
            )
        except (httpx.TimeoutException, asyncio.TimeoutError) as exc:
            return result(SourceStatus.TIMEOUT, [], f"Apple App Store search timed out after {self.timeout_seconds:g} seconds.", error_details=str(exc) or "Request timeout")
        except httpx.RequestError as exc:
            return result(SourceStatus.UNAVAILABLE, [], "Could not connect to Apple App Store search.", error_details=str(exc))
        except (ValueError, TypeError) as exc:
            return result(SourceStatus.FAILED, [], "Could not read Apple's App Store search response.", error_details=str(exc))
        except Exception as exc:
            return result(SourceStatus.FAILED, [], "Apple App Store collection failed.", error_details=str(exc))
