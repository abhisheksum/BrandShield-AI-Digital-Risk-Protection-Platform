from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List
from pathlib import Path
import secrets

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
    PROJECT_NAME: str = "Rakshak — Digital Brand Protection"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./rakshak.db"
    UPLOAD_DIR: str = str(Path(__file__).resolve().parents[1] / "uploads")

    # JWT Auth Settings
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(48), min_length=32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Apple's public iTunes Search API is unauthenticated. Country is an ISO
    # 3166-1 alpha-2 store code; the API returns at most 200 results.
    APPLE_STORE_COUNTRY: str = "us"
    APPLE_STORE_RESULT_LIMIT: int = Field(default=25, ge=1, le=200)
    APPLE_STORE_TIMEOUT_SECONDS: float = Field(default=6.0, gt=0, le=30)

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

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

settings = Settings()
