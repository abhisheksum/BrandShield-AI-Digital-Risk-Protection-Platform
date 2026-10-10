import copy
from typing import List, Dict, Any
from app.collectors.base import BaseCollector, CollectorResult, SourceStatus
from app.collectors.fixtures.synthetic_records import DEMO_APP_CANDIDATES
from app.core.normalization import normalize_text

class AppStoreCollector(BaseCollector):
    def __init__(self, simulate_network: bool = True):
        self.simulate_network = simulate_network

    def get_collector_name(self) -> str:
        return "AppStoreCollector (Google Play & Apple App Store)"

    async def collect(self, brand_name: str, keywords: List[str] = None) -> CollectorResult:
        """
        Collects mobile app listings matching target brand.
        """
        target_norm = normalize_text(brand_name)
        candidates = []

        for record in DEMO_APP_CANDIDATES:
            cand = copy.deepcopy(record)
            cand["candidate_name"] = cand["candidate_name"].replace("ApexPay", brand_name)
            cand["candidate_identifier"] = cand["candidate_identifier"].replace("apexpay", target_norm.replace(" ", ""))
            cand["candidate_url"] = cand["candidate_url"].replace("apexpay", target_norm.replace(" ", ""))
            cand["description"] = cand["description"].replace("ApexPay", brand_name)
            candidates.append(cand)

        return CollectorResult(
            collector_name=self.get_collector_name(),
            status=SourceStatus.COMPLETED,
            candidates=candidates,
            message="Gathered app store listings from Google Play Store and iOS App Store indexes.",
            is_demo=True
        )
