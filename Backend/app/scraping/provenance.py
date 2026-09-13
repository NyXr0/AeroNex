"""
Writes one fare row + one provenance_log row per scraped flight — the
"provenance panel" data path from AeroNex_Architecture.md, not a slide claim.

Plain sqlite3 (see app/db.py) — no ORM.
"""
import hashlib
import sqlite3
from datetime import date, datetime, timezone


def fare_fingerprint(origin: str, destination: str, window_days: int, carrier: str, travel_date: date) -> str:
    """Canonical hash: route+window+carrier+date, so a re-scrape updates rather than duplicates."""
    raw = f"{origin}-{destination}|{window_days}|{carrier}|{travel_date.isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_or_create_route(conn: sqlite3.Connection, origin: str, destination: str) -> int:
    conn.execute(
        "INSERT OR IGNORE INTO routes (origin, destination) VALUES (?, ?)", (origin, destination)
    )
    row = conn.execute(
        "SELECT id FROM routes WHERE origin = ? AND destination = ?", (origin, destination)
    ).fetchone()
    return row["id"]


def _get_or_create_source(conn: sqlite3.Connection, name: str, base_url: str, robots_status: str) -> int:
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT OR IGNORE INTO sources (name, base_url, robots_status, last_checked_at) VALUES (?, ?, ?, ?)",
        (name, base_url, robots_status, now),
    )
    conn.execute(
        "UPDATE sources SET robots_status = ?, last_checked_at = ? WHERE name = ?",
        (robots_status, now, name),
    )
    return conn.execute("SELECT id FROM sources WHERE name = ?", (name,)).fetchone()["id"]


def record_fare(
    conn: sqlite3.Connection,
    *,
    origin: str,
    destination: str,
    window_days: int,
    travel_date: date,
    carrier: str,
    total: float,
    source_name: str,
    source_base_url: str,
    source_url: str,
    http_status: int,
    robots_check_result: str,
    snapshot_path: str | None,
    base_fare: float | None = None,
    tax: float | None = None,
    fees: float | None = None,
) -> int:
    """Returns the fare id (existing or newly created)."""
    route_id = _get_or_create_route(conn, origin, destination)
    source_id = _get_or_create_source(conn, source_name, source_base_url, robots_check_result)
    fp = fare_fingerprint(origin, destination, window_days, carrier, travel_date)
    now = datetime.now(timezone.utc).isoformat()

    existing = conn.execute("SELECT id FROM fares WHERE fare_fingerprint = ?", (fp,)).fetchone()
    if existing is None:
        cur = conn.execute(
            """INSERT INTO fares (route_id, window_days, carrier, source_id, total, base_fare, tax, fees, fare_fingerprint, scraped_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (route_id, window_days, carrier, source_id, total, base_fare, tax, fees, fp, now),
        )
        fare_id = cur.lastrowid
    else:
        fare_id = existing["id"]
        conn.execute(
            "UPDATE fares SET total = ?, base_fare = ?, tax = ?, fees = ?, scraped_at = ? WHERE id = ?",
            (total, base_fare, tax, fees, now, fare_id),
        )  # re-scrape updates, per fare_fingerprint's whole purpose

    conn.execute(
        """INSERT INTO provenance_log (fare_id, source_url, http_status, robots_check_result, snapshot_path, scraped_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (fare_id, source_url, http_status, robots_check_result, snapshot_path, now),
    )
    conn.commit()
    return fare_id


def demo() -> None:
    """Runnable self-check: in-memory sqlite, no network. `python -m app.scraping.provenance`."""
    from app.db import get_connection

    conn = get_connection(":memory:")

    kwargs = dict(
        origin="DEL",
        destination="BOM",
        window_days=1,
        travel_date=date(2026, 9, 14),
        carrier="IndiGo",
        total=6530.0,
        source_name="EaseMyTrip",
        source_base_url="https://www.easemytrip.com",
        source_url="https://www.easemytrip.com",
        http_status=200,
        robots_check_result="allowed",
        snapshot_path=None,
    )

    fare_id_1 = record_fare(conn, **kwargs)
    assert conn.execute("SELECT COUNT(*) c FROM fares").fetchone()["c"] == 1
    assert conn.execute("SELECT COUNT(*) c FROM provenance_log").fetchone()["c"] == 1

    # Re-scrape of the same route+window+carrier+date must update, not duplicate.
    kwargs["total"] = 6090.0
    fare_id_2 = record_fare(conn, **kwargs)
    assert fare_id_1 == fare_id_2, "same fare_fingerprint must reuse the row"
    assert conn.execute("SELECT COUNT(*) c FROM fares").fetchone()["c"] == 1, "re-scrape duplicated a fare row"
    assert conn.execute("SELECT COUNT(*) c FROM provenance_log").fetchone()["c"] == 2, "each scrape needs its own log row"
    assert conn.execute("SELECT total FROM fares WHERE id = ?", (fare_id_1,)).fetchone()["total"] == 6090.0

    print("OK — record_fare dedupes by fingerprint and logs every provenance row")


if __name__ == "__main__":
    demo()
