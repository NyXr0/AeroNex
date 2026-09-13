"""
Phase 1.4: run the real scrape across all 3 locked routes x 3 fare windows
in one job - the same scrape_with_fallback -> record_fare path run_spike.py
already proved end-to-end (Phase 0.2), just looped over the full matrix
instead of one route/window at a time.

    python run_live_scrape.py

# ponytail: reuses run_spike.main() directly rather than re-implementing
# the scrape->record_fare flow here - one path, same behavior (writes the
# disclosure log, skips writing on robots-disallow, etc.) whether you run
# one combination or all 9. Only real difference: this catches a failure on
# one combination and keeps going, so one bad route doesn't lose data for
# the other 8 - each combo is independent, no reason a DEL-BLR hiccup
# should cost you the DEL-BOM rows.
#
# Same real-internet requirement as run_spike.py: run this on your own
# terminal, not the sandboxed device shell (see run_spike.py's docstring).
"""
from app.config import FARE_WINDOWS, LOCKED_ROUTES
from app.db import get_connection
from app.processing.live_index import compute_and_store
import run_spike


def main() -> None:
    results = []
    for origin, destination in LOCKED_ROUTES:
        for window_days in FARE_WINDOWS:
            print(f"\n=== {origin}->{destination} T+{window_days} ===")
            try:
                run_spike.main(origin, destination, window_days)
                results.append((origin, destination, window_days, "ran"))
            except Exception as exc:
                print(f"  [error] {origin}->{destination} T+{window_days}: {exc}")
                results.append((origin, destination, window_days, f"error: {exc}"))

    print("\n--- Summary ---")
    for origin, destination, window_days, status in results:
        print(f"  {origin}->{destination} T+{window_days}: {status}")

    # Turn today's scraped fares into index_values rows, so the dashboard's
    # headline index actually moves from real data instead of only ever
    # showing the demo seed - see app/processing/live_index.py.
    print("\n--- Computing real index values ---")
    conn = get_connection()
    try:
        index_results = compute_and_store(conn)
    finally:
        conn.close()
    if not index_results:
        print("  No real fares scraped today for any locked route/window - nothing to index.")
    for r in index_results:
        print(f"  {r['route']} T+{r['window_days']}: index {r['index_value']} "
              f"(today {r['today_avg_price']}, base {r['real_base_price']})")


if __name__ == "__main__":
    main()
