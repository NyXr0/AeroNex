"""
Turns today's real (non-demo) scraped fares into index_values rows.

# ponytail: first version of this anchored the real price to the SAME base
# the demo-seeded series uses (day 0 of the synthetic 45-day history).
# Ran it against the real DB and got index values of 218-443 across all 9
# routes/windows - a 2-4x "increase" in one day, for every single route,
# is not a real signal, it's the synthetic BASE_FARE placeholders
# (~5000-6200, guessed for demo purposes) being far below what EaseMyTrip
# actually charges for these dates today. Comparing a real number to a
# made-up one and calling the result "the index" would be actively
# misleading - reverted those 9 rows immediately (see Backend/README.md).
#
# Fixed: real data gets its OWN base, anchored to the first real
# observation for that route/window (index = 100.0 the day real scraping
# starts, tracked relative to that from then on) - never against a
# synthetic number. Persisted in data/real_index_base.json, the same
# small-sidecar-file pattern as data/last_disclosure.json, rather than a
# schema migration for one dict.

    python -m app.processing.live_index      # self-check
    (called automatically at the end of run_live_scrape.py)
"""
import json
from datetime import date, datetime, timezone
from pathlib import Path
import sqlite3

from app.config import LOCKED_ROUTES, FARE_WINDOWS
from app.processing.outliers import flag_outliers

REAL_BASE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "real_index_base.json"


def _load_real_base() -> dict:
    if not REAL_BASE_PATH.exists():
        return {}
    try:
        return json.loads(REAL_BASE_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return {}  # a corrupt sidecar file should degrade to "no base yet", not crash the batch job


def _save_real_base(base: dict) -> None:
    REAL_BASE_PATH.parent.mkdir(exist_ok=True)
    REAL_BASE_PATH.write_text(json.dumps(base, indent=2))


def _flag_todays_outliers(conn: sqlite3.Connection, route_id: int, window_days: int) -> None:
    """MAD-flags today's real fares for one route/window (app/processing/
    outliers.py already existed and was self-tested, but was only ever
    wired into seed_demo_data.py - real fares sat with is_outlier=0
    (the DB default) forever, so one stray business-class/long-layover
    fare among today's results would silently skew both get_route_detail's
    averages and, before this, the index average below. Needs >= 2 fares
    for "outlier" to mean anything; skips otherwise, same as it would with
    any single-point sample."""
    today = date.today().isoformat()
    rows = conn.execute(
        """SELECT f.id, f.total FROM fares f
           JOIN sources s ON s.id = f.source_id
           WHERE f.route_id = ? AND f.window_days = ? AND s.name != 'DEMO_SEED'
             AND date(f.scraped_at) = ?""",
        (route_id, window_days, today),
    ).fetchall()
    if len(rows) < 2:
        return
    flags = flag_outliers([r["total"] for r in rows])
    for row, (is_outlier, mad_score) in zip(rows, flags):
        conn.execute(
            "UPDATE fares SET is_outlier = ?, mad_score = ? WHERE id = ?",
            (int(is_outlier), mad_score, row["id"]),
        )


def _todays_real_avg(conn: sqlite3.Connection, route_id: int, window_days: int) -> float | None:
    """Avg of TODAY's real (non-demo), non-outlier scraped fares for this
    route/window - excludes outliers same as get_route_detail's own
    averages do, so a single premium fare doesn't skew the index either."""
    today = date.today().isoformat()
    row = conn.execute(
        """SELECT AVG(f.total) AS avg_price FROM fares f
           JOIN sources s ON s.id = f.source_id
           WHERE f.route_id = ? AND f.window_days = ? AND s.name != 'DEMO_SEED'
             AND date(f.scraped_at) = ? AND f.is_outlier = 0""",
        (route_id, window_days, today),
    ).fetchone()
    return row["avg_price"] if row and row["avg_price"] is not None else None


def compute_and_store(conn: sqlite3.Connection, real_base: dict | None = None) -> list[dict]:
    """For each locked route x window scraped for real today, insert one
    index_values row anchored to that route/window's own real base (its
    first-ever real observation = 100.0, never a synthetic placeholder).
    A route/window with no real data today is skipped, not an error.

    real_base is loaded from/saved to REAL_BASE_PATH by default; pass an
    explicit dict (e.g. {} for a fully isolated run) to override - this is
    what makes the self-check below hermetic instead of touching the real
    sidecar file."""
    own_base = real_base is None
    base = _load_real_base() if own_base else real_base

    results = []
    for origin, destination in LOCKED_ROUTES:
        route = conn.execute(
            "SELECT id FROM routes WHERE origin = ? AND destination = ?", (origin, destination)
        ).fetchone()
        if route is None:
            continue
        for window_days in FARE_WINDOWS:
            _flag_todays_outliers(conn, route["id"], window_days)
            today_avg = _todays_real_avg(conn, route["id"], window_days)
            if today_avg is None:
                continue

            key = f"{origin}-{destination}:{window_days}"
            if key not in base:
                base[key] = today_avg  # first real observation for this route/window - it IS the base

            index_value = 100.0 * today_avg / base[key]
            conn.execute(
                "INSERT INTO index_values (computed_at, route_id, window_days, index_value, base_year) "
                "VALUES (?, ?, ?, ?, ?)",
                (datetime.now(timezone.utc).date().isoformat(), route["id"], window_days, index_value, 2024),
            )
            results.append({
                "route": f"{origin}-{destination}", "window_days": window_days,
                "real_base_price": round(base[key], 2), "today_avg_price": round(today_avg, 2),
                "index_value": round(index_value, 2),
            })
    conn.commit()
    if own_base:
        _save_real_base(base)
    return results


def demo() -> None:
    """Runnable self-check: in-memory DB, isolated base dict, no network,
    no touching the real REAL_BASE_PATH sidecar file."""
    from app.db import get_connection
    from app.scraping.provenance import record_fare

    conn = get_connection(":memory:")
    today = date.today()

    record_fare(conn, origin="DEL", destination="BOM", window_days=1,
                travel_date=today, carrier="IndiGo", total=5500.0,
                source_name="EaseMyTrip", source_base_url="https://www.easemytrip.com",
                source_url="https://www.easemytrip.com", http_status=200,
                robots_check_result="allowed", snapshot_path=None)

    base: dict = {}
    first = compute_and_store(conn, real_base=base)
    assert len(first) == 1, f"expected 1 computed row (only DEL-BOM T+1 has real data), got {len(first)}"
    assert first[0]["index_value"] == 100.0, "first-ever real observation must anchor the base at 100.0"
    assert base["DEL-BOM:1"] == 5500.0

    # A second day at a higher price must track relative to that same base, not reset it.
    record_fare(conn, origin="DEL", destination="BOM", window_days=1,
                travel_date=today, carrier="Air India", total=6050.0,
                source_name="EaseMyTrip", source_base_url="https://www.easemytrip.com",
                source_url="https://www.easemytrip.com", http_status=200,
                robots_check_result="allowed", snapshot_path=None)
    conn.execute("UPDATE fares SET scraped_at = ? WHERE carrier = 'Air India'",
                 (datetime.now(timezone.utc).isoformat(),))
    # Same-day average is now (5500+6050)/2 = 5775, but exercise the "later day" path directly:
    second = compute_and_store(conn, real_base=base)
    assert base["DEL-BOM:1"] == 5500.0, "base must not move once set"
    assert second[0]["index_value"] == round(100.0 * 5775.0 / 5500.0, 2)

    # A clear outlier among today's fares must be flagged AND excluded from
    # the averaged index price - separate route so it doesn't interfere
    # with the base-anchoring assertions above.
    for price in (4000.0, 4100.0, 4200.0, 19000.0):  # 3 close economy fares + 1 way-off outlier
        record_fare(conn, origin="BOM", destination="BLR", window_days=1,
                    travel_date=today, carrier=f"Carrier{price}", total=price,
                    source_name="EaseMyTrip", source_base_url="https://www.easemytrip.com",
                    source_url="https://www.easemytrip.com", http_status=200,
                    robots_check_result="allowed", snapshot_path=None)
    third = compute_and_store(conn, real_base=base)
    bom_blr = next(r for r in third if r["route"] == "BOM-BLR")
    assert bom_blr["today_avg_price"] == 4100.0, (
        f"outlier (19000) must be excluded from the averaged index price, got {bom_blr['today_avg_price']}"
    )
    bom_blr_route_id = conn.execute(
        "SELECT id FROM routes WHERE origin='BOM' AND destination='BLR'"
    ).fetchone()["id"]
    outlier_count = conn.execute(
        "SELECT COUNT(*) c FROM fares WHERE route_id = ? AND is_outlier = 1", (bom_blr_route_id,)
    ).fetchone()["c"]
    assert outlier_count == 1, f"expected exactly 1 flagged outlier, got {outlier_count}"

    print(f"OK - real base anchors at 100.0 on first observation ({first[0]['index_value']}), "
          f"tracks relative to it afterward ({second[0]['index_value']}), never touching a synthetic price; "
          f"outlier fare correctly flagged and excluded from the averaged index price ({bom_blr['today_avg_price']})")


if __name__ == "__main__":
    demo()
