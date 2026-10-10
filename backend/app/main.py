from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models  # Register all models with Base

# Initialize SQLite database schema (safe — only creates new tables/columns)
Base.metadata.create_all(bind=engine)
from app.migrations import migrate_schema
migrate_schema(engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Rakshak — Digital Brand Protection Platform. Detects brand impersonation on social media and app stores.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Static files for uploaded brand logos
import os
from fastapi.staticfiles import StaticFiles
uploads_dir = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Mount Routers
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.brands import router as brands_router
from app.api.scans import router as scans_router
from app.api.alerts import router as alerts_router

app.include_router(health_router)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(brands_router, prefix=settings.API_V1_STR)
app.include_router(scans_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Rakshak — Digital Brand Protection API is operational",
        "docs": "/docs",
        "version": settings.VERSION
    }
