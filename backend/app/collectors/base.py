from abc import ABC, abstractmethod
from typing import List, Dict, Any
from enum import Enum

class SourceStatus(str, Enum):
    COMPLETED = "completed"
    PARTIAL = "partial"
    UNAVAILABLE = "unavailable"
    FAILED = "failed"

class CollectorResult:
    def __init__(
        self,
        collector_name: str,
        status: SourceStatus,
        candidates: List[Dict[str, Any]],
        message: str = "",
        is_demo: bool = False
    ):
        self.collector_name = collector_name
        self.status = status
        self.candidates = candidates
        self.message = message
        self.is_demo = is_demo

    def to_dict(self) -> Dict[str, Any]:
        return {
            "collector_name": self.collector_name,
            "status": self.status.value,
            "candidates_count": len(self.candidates),
            "message": self.message,
            "is_demo": self.is_demo
        }

class BaseCollector(ABC):
    @abstractmethod
    def get_collector_name(self) -> str:
        """Returns the unique name of the collector."""
        pass

    @abstractmethod
    async def collect(self, brand_name: str, keywords: List[str] = None) -> CollectorResult:
        """Executes collection of candidates for the target brand."""
        pass
