import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import inspect, text

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./brandshield.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

def init_db():
    from app import models  # noqa: F401
    Base.metadata.create_all(engine)
    # Lightweight forward-compatible schema patch for existing SQLite MVP databases.
    if DATABASE_URL.startswith("sqlite") and "brands" in inspect(engine).get_table_names():
        columns={c["name"] for c in inspect(engine).get_columns("brands")}
        if "logo_path" not in columns:
            with engine.begin() as conn: conn.execute(text("ALTER TABLE brands ADD COLUMN logo_path VARCHAR(500) NOT NULL DEFAULT ''"))
