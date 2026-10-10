from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models  # Register all models with Base

# Initialize SQLite database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Digital Risk Protection Platform for detecting brand impersonation and suspicious mobile applications.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
from app.api.health import router as health_router
from app.api.brands import router as brands_router
from app.api.scans import router as scans_router
from app.api.alerts import router as alerts_router

app.include_router(health_router)
app.include_router(brands_router, prefix=settings.API_V1_STR)
app.include_router(scans_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "BrandShield AI API is operational",
        "docs": "/docs",
        "version": settings.VERSION
    }
