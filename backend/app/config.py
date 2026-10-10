from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "BrandShield AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./brandshield.db"
    
    # Risk score calculation default weights (must sum to 1.0)
    WEIGHT_NAME_SIMILARITY: float = 0.30
    WEIGHT_LOGO_SIMILARITY: float = 0.25
    WEIGHT_DESCRIPTION_SIMILARITY: float = 0.20
    WEIGHT_PUBLISHER_MISMATCH: float = 0.15
    WEIGHT_SUSPICIOUS_BEHAVIOR: float = 0.10
    
    # Thresholds
    ALERT_RISK_THRESHOLD: float = 40.0  # Scores >= 40 generate alerts
    CRITICAL_RISK_THRESHOLD: float = 80.0
    HIGH_RISK_THRESHOLD: float = 65.0
    MEDIUM_RISK_THRESHOLD: float = 45.0
    
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
