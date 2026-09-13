"""
Historical/public-data ingestion: DGCA monthly city-pair passenger traffic ->
routes.dgca_weight (the Fisher-index weighting field in app/db.py).

DGCA does not publish a clean average-fare file (confirmed in the Phase 0.1
research spike - see AeroNex_Research_Phase_Report.md section 2), so the
honest, buildable piece of "historical ingestion" is traffic-share weighting,
not fare back-testing. This has no scraping-compliance question at all: it
parses a document that's already public, per app's Security section.

    python -m app.scraping.historical.dgca_ingest sample_dgca_traffic.csv

Real source for a production CSV: https://www.dgca.gov.in (monthly PDFs) or
the pre-cleaned mirror https://github.com/Vonter/india-aviation-traffic.
"""
import csv
import sys
from pathlib import Path

from app.db import get_connection
from app.scraping.provenance import _get_or_create_route


def ingest(csv_path: Path, conn=None) -> dict[tuple[str, str], float]:
    """Reads an origin,destination,month,passengers CSV; returns route -> weight
    (share of total passengers across every row in the file) and writes it to
    routes.dgca_weight. Comment lines starting with '#' are skipped."""
    rows = []
    with open(csv_path, newline="") as f:
        lines = [ln for ln in f if not ln.lstrip().startswith("#")]
        for row in csv.DictReader(lines):
            rows.append((row["origin"], row["destination"], int(row["passengers"])))

    total = sum(p for _, _, p in rows)
    if total == 0:
        raise ValueError(f"no passenger data in {csv_path}")

    weights: dict[tuple[str, str], float] = {}
    own_conn = conn is None
    conn = conn or get_connection()
    try:
        for origin, destination, passengers in rows:
            weight = passengers / total
            weights[(origin, destination)] = weight
            route_id = _get_or_create_route(conn, origin, destination)
            conn.execute("UPDATE routes SET dgca_weight = ? WHERE id = ?", (weight, route_id))
        conn.commit()
    finally:
        if own_conn:
            conn.close()
    return weights


def demo() -> None:
    """Runnable self-check: in-memory sqlite, no network."""
    sample = Path(__file__).parent / "sample_dgca_traffic.csv"
    conn = get_connection(":memory:")
    weights = ingest(sample, conn)

    assert abs(sum(weights.values()) - 1.0) < 1e-9, "weights must sum to 1.0"
    assert max(weights, key=weights.get) == ("DEL", "BOM"), "DEL-BOM should be the heaviest route"

    row = conn.execute(
        "SELECT dgca_weight FROM routes WHERE origin='DEL' AND destination='BOM'"
    ).fetchone()
    assert row["dgca_weight"] == weights[("DEL", "BOM")], "weight must be persisted to routes table"

    print(f"OK - ingested {len(weights)} routes, DEL-BOM weight={weights[('DEL','BOM')]:.4f}")


if __name__ == "__main__":
    if len(sys.argv) == 2:
        result = ingest(Path(sys.argv[1]))
        for (o, d), w in sorted(result.items(), key=lambda kv: -kv[1]):
            print(f"{o}-{d}: {w:.4f}")
    else:
        demo()
