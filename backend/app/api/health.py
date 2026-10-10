from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pathlib import Path
import os
from sqlalchemy import text
from app.config import settings
from app.database import engine

router = APIRouter(tags=["Health"])

@router.get("/health")
@router.get("/api/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        upload_path = Path(settings.UPLOAD_DIR)
        if not upload_path.is_dir() or not os.access(upload_path, os.W_OK):
            raise RuntimeError("Upload storage directory is missing or not writable")
    except Exception:
        return JSONResponse(status_code=503, content={
            "status": "unhealthy",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
        })
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
