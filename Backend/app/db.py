"""
DB layer for the Phase-0 spike — plain stdlib sqlite3, no ORM.

# ponytail: SQLAlchemy was the first draft; dropped it — this sandbox has no
# package-install network access, and 4 small tables for a one-route spike
# don't need an ORM anyway (stdlib does it). Schema matches
# AeroNex_Architecture.md's Database section so a real Postgres migration
# later is a straight SQL port, not a redesign.
"""
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


def get_connection(db_path: Path | str = DB_PATH) -> sqlite3.Connection:
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
