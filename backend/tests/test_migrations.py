from sqlalchemy import create_engine, inspect, text

from app.migrations import migrate_schema


def test_legacy_scan_rows_gain_nullable_result_counters_without_fabricated_zeros():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE brands (id INTEGER PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE scans (id INTEGER PRIMARY KEY, brand_id INTEGER)"))
        connection.execute(text("INSERT INTO scans (id, brand_id) VALUES (1, 7)"))

    migrate_schema(engine)
    migrate_schema(engine)  # startup migration is safe to run repeatedly

    scan_columns = {column["name"] for column in inspect(engine).get_columns("scans")}
    assert "candidates_evaluated" in scan_columns
    assert "official_assets_excluded" in scan_columns
    with engine.connect() as connection:
        legacy_counts = connection.execute(text(
            "SELECT candidates_evaluated, official_assets_excluded FROM scans WHERE id = 1"
        )).one()
    # Historical scans did not record these counts, so they remain unknown.
    assert legacy_counts == (None, None)
    engine.dispose()
