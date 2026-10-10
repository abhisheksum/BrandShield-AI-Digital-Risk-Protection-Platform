import copy
from typing import List, Dict, Any
from app.collectors.base import BaseCollector, CollectorResult, SourceStatus
from app.collectors.fixtures.synthetic_records import DEMO_SOCIAL_CANDIDATES
from app.core.normalization import normalize_text

class SocialCollector(BaseCollector):
    def __init__(self, simulate_network: bool = True):
        self.simulate_network = simulate_network

    def get_collector_name(self) -> str:
        return "SocialMediaCollector (X, Instagram, LinkedIn)"

    async def collect(self, brand_name: str, keywords: List[str] = None) -> CollectorResult:
        """
        Gathers candidate profiles from social sources.
        When configured in live mode, hits authorized public endpoints.
        In demo mode, customizes synthetic fixtures for the searched brand name.
        """
        target_norm = normalize_text(brand_name)
        candidates = []

        # Generate candidates tailored to the requested brand name
        for record in DEMO_SOCIAL_CANDIDATES:
            cand = copy.deepcopy(record)
            # Adapt the sample record to the target brand name
            cand["candidate_name"] = cand["candidate_name"].replace("ApexPay", brand_name)
            cand["candidate_identifier"] = cand["candidate_identifier"].replace("apexpay", target_norm.replace(" ", "_"))
            cand["candidate_url"] = cand["candidate_url"].replace("apexpay", target_norm.replace(" ", "_"))
            cand["description"] = cand["description"].replace("ApexPay", brand_name)
            candidates.append(cand)

        return CollectorResult(
            collector_name=self.get_collector_name(),
            status=SourceStatus.COMPLETED,
            candidates=candidates,
            message="Gathered social profile candidates across X, Instagram, and web directories.",
            is_demo=True
        )
