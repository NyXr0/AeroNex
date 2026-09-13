"""
Phase 0.2 entry point: one route, one window, real Playwright scrape ->
provenance log, end-to-end.

    python run_spike.py DEL BOM 1        # T+1

# ponytail: only runs from a machine with real internet — this sandbox's
# device shell and cloud container both have their egress locked down (see
# chat), so this has been verified structurally + against a captured real
# sample (test_parser.py), NOT executed end-to-end from here. Run it on your
# own machine's normal terminal (not the restricted device_bash VM) and fix
# whatever breaks — that observation is Phase 0's actual point.
"""
import sys

from app.db import DB_PATH, get_connection
from app.scraping.live.easemytrip import BASE_URL, SOURCE_NAME
from app.scraping.live.sources import scrape_with_fallback
from app.scraping.provenance import record_fare


def main(origin: str, destination: str, window_days: int) -> None:
    result = scrape_with_fallback(origin, destination, window_days)

    import json
    from pathlib import Path
    disclosure_path = Path(__file__).parent / "data" / "last_disclosure.json"
    disclosure_path.parent.mkdir(exist_ok=True)
    disclosure_path.write_text(json.dumps({
        "origin": origin, "destination": destination, "window_days": window_days,
        "disclosure": result["disclosure"], "source_used": result["source_used"],
    }, indent=2))

    for attempt in result["disclosure"]:
        print(f"  [{attempt['status']}] {attempt['source']}: {attempt['action']}"
              + (f" ({attempt['error']})" if attempt.get("error") else ""))

    if not result["ok"]:
        print(f"No source could be scraped for {origin}->{destination} T+{window_days} this run "
              f"— disclosed above, nothing written (Phase 2's graceful-fallback, not a blank hole).")
        return

    fares = result["fares"]
    print(f"Scraped {len(fares)} fares for {origin}->{destination}, T+{window_days} "
          f"({result['travel_date']}) via {result['source_used']} — robots: {result['robots_result']}, "
          f"HTTP {result['http_status']}")

    if result["robots_result"] != "allowed":
        print("robots.txt disallows this path — nothing written, per compliance-first scraping.")
        return

    conn = get_connection()
    try:
        for fare in fares:
            record_fare(
                conn,
                origin=origin,
                destination=destination,
                window_days=window_days,
                travel_date=result["travel_date"],
                carrier=fare.airline,
                total=fare.price,
                source_name=result["source_used"] or SOURCE_NAME,
                source_base_url=BASE_URL,  # only EaseMyTrip is implemented today, see sources.py
                source_url=result["source_url"],
                http_status=result["http_status"],
                robots_check_result=result["robots_result"],
                snapshot_path=result["snapshot_path"],
            )
        print(f"Wrote {len(fares)} fare + provenance rows to {DB_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("usage: python run_spike.py <ORIGIN> <DEST> <WINDOW_DAYS>")
        print("example: python run_spike.py DEL BOM 1")
        sys.exit(1)
    main(sys.argv[1].upper(), sys.argv[2].upper(), int(sys.argv[3]))
