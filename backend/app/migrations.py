"""Small, additive migrations compatible with SQLite and PostgreSQL."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def migrate_schema(engine: Engine) -> None:
    """Add the nullable brand owner column without deleting existing records.

    Existing brands remain unassigned and therefore hidden from authenticated
    organisations until an administrator intentionally assigns ownership.
    """
    inspector = inspect(engine)
    if "brands" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("brands")}
    if "user_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE brands ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL"
            ))
        with engine.begin() as connection:
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_brands_user_id ON brands (user_id)"))

    # Keep scan counts additive for databases created before scan accounting
    # distinguished collected candidates, scored candidates and asset exclusions.
    inspector = inspect(engine)
    if "scans" in inspector.get_table_names():
        scan_columns = {column["name"] for column in inspector.get_columns("scans")}
        with engine.begin() as connection:
            if "candidates_evaluated" not in scan_columns:
                connection.execute(text("ALTER TABLE scans ADD COLUMN candidates_evaluated INTEGER"))
            if "official_assets_excluded" not in scan_columns:
                connection.execute(text("ALTER TABLE scans ADD COLUMN official_assets_excluded INTEGER"))
