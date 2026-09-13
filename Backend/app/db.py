"""
DB layer for the Phase-0 spike — plain stdlib sqlite3, no ORM.

# ponytail: SQLAlchemy was the first draft; dropped it — this sandbox has no
# package-install network access, and 4 small tables for a one-route spike
# don't need an ORM anyway (stdlib does it). Schema matches
# AeroNex_Architecture.md's Database section so a real Postgres migration
# later is a straight SQL port, not a redesign.
#
# That migration has now happened (see get_connection below): when
# DATABASE_URL is set, every caller of get_connection() — handlers.py,
# provenance.py, live_index.py, dgca_ingest.py — transparently gets a
# Postgres-backed connection instead, with the exact same .execute()/
# .commit()/.close() shape sqlite3.Connection has. None of those callers
# changed a single line; only this file grew a second backend. Local dev
# and every demo()/self-check function stay on SQLite unconditionally
# (see _PGConnection and the ":memory:" carve-out below) so nothing about
# day-to-day development or the existing test story changes.
"""
import os
import re
import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "aeronex_spike.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    base_url TEXT NOT NULL,
    robots_status TEXT,
    last_checked_at TEXT
);

CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    dgca_weight REAL,
    UNIQUE(origin, destination)
);

CREATE TABLE IF NOT EXISTS fares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL REFERENCES routes(id),
    window_days INTEGER NOT NULL,
    carrier TEXT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES sources(id),
    base_fare REAL,
    tax REAL,
    fees REAL,
    total REAL NOT NULL,
    fare_fingerprint TEXT NOT NULL UNIQUE,
    is_outlier INTEGER DEFAULT 0,
    mad_score REAL,
    scraped_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provenance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fare_id INTEGER NOT NULL REFERENCES fares(id),
    source_url TEXT NOT NULL,
    http_status INTEGER,
    robots_check_result TEXT NOT NULL,
    snapshot_path TEXT,
    scraped_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS index_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    computed_at TEXT NOT NULL,
    route_id INTEGER NOT NULL REFERENCES routes(id),
    window_days INTEGER NOT NULL,
    index_value REAL NOT NULL,
    base_year INTEGER NOT NULL DEFAULT 2024
);

CREATE TABLE IF NOT EXISTS backtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    aeronex_growth_rate REAL,
    dgca_proxy_growth_rate REAL,
    correlation_metric REAL,
    method TEXT NOT NULL DEFAULT 'mom_growth_rate'
);
"""


def _get_sqlite_connection(db_path: Path | str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    # ponytail: the project folder is a network/FUSE-bridged mount (Windows <-
    # Cowork device bridge), which breaks sqlite's default rollback-journal
    # locking ("disk I/O error" on commit). journal_mode=MEMORY keeps the
    # journal off that filesystem entirely - fine for a single-writer
    # hackathon prototype; revisit if this ever runs multi-process against
    # a real network share.
    conn.execute("PRAGMA journal_mode=MEMORY")
    conn.executescript(SCHEMA)
    return conn


# --- Postgres path (production, DATABASE_URL set) --------------------------
#
# A same-shaped stand-in for sqlite3.Connection, not a general ORM: every
# caller only ever uses conn.execute(sql, params) -> cursor with
# .fetchone()/.fetchall()/.lastrowid, plus conn.commit()/.close(). Three
# sqlite-isms get rewritten in transit so the SQL text itself (written once,
# for sqlite, throughout handlers.py/provenance.py/live_index.py/
# dgca_ingest.py) keeps working unmodified against Postgres:
#   1. `?` positional placeholders -> `%s` (psycopg2's style).
#   2. `INSERT OR IGNORE INTO` -> `INSERT INTO ... ON CONFLICT DO NOTHING`
#      (bare DO NOTHING, no target column list, matches sqlite's "ignore on
#      ANY constraint violation" semantics for both call sites that use it —
#      routes' and sources' UNIQUE constraints).
#   3. `INSERT INTO fares (...)` gets `RETURNING id` appended (when not
#      already present) so `cur.lastrowid` — used exactly once, in
#      provenance.record_fare — still works; Postgres has no native
#      lastrowid.
# Verified against the live Supabase Postgres instance: date(text) casts,
# multi-column IN (...), JOIN/GROUP BY/AVG/CASE, and all of the above all
# behave identically to the sqlite originals.
_INSERT_FARES_RE = re.compile(r"^\s*INSERT\s+INTO\s+fares\b", re.IGNORECASE)


class _PGCursor:
    def __init__(self, cur, lastrowid=None):
        self._cur = cur
        self.lastrowid = lastrowid

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()


class _PGConnection:
    def __init__(self, dsn: str):
        import psycopg2
        import psycopg2.extras

        self._extras = psycopg2.extras
        self._conn = psycopg2.connect(dsn)

    def execute(self, sql: str, params=()) -> _PGCursor:
        pg_sql = sql.replace("?", "%s")
        if "INSERT OR IGNORE" in pg_sql:
            pg_sql = pg_sql.replace("INSERT OR IGNORE", "INSERT") + " ON CONFLICT DO NOTHING"

        wants_lastrowid = bool(_INSERT_FARES_RE.match(sql)) and "RETURNING" not in pg_sql.upper()
        if wants_lastrowid:
            pg_sql += " RETURNING id"

        cur = self._conn.cursor(cursor_factory=self._extras.RealDictCursor)
        cur.execute(pg_sql, params)

        lastrowid = None
        if wants_lastrowid:
            row = cur.fetchone()
            lastrowid = row["id"] if row else None
        return _PGCursor(cur, lastrowid)

    def commit(self) -> None:
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()


def get_connection(db_path: Path | str = DB_PATH):
    """Same signature/behavior as before for every existing caller. The one
    addition: when DATABASE_URL is set AND no explicit db_path override was
    passed (i.e. this is a real, non-test call), return a Postgres-backed
    connection instead. Every self-check/demo() function in this codebase
    explicitly passes ":memory:" and so is unaffected — self-checks always
    run against isolated SQLite, in prod or not."""
    database_url = os.environ.get("DATABASE_URL")
    if database_url and db_path == DB_PATH:
        return _PGConnection(database_url)
    return _get_sqlite_connection(db_path)
