"""
Seeds realistic-looking demo fare data for the 3 locked routes x 3 windows
(Build Order Phase 1.3/1.4 scope) so the API/dashboard have real rows to
serve TODAY, ahead of the user's own live Playwright run.

Every fare row goes through the *same* record_fare()/schema path a real
scrape would use, tagged source_name="DEMO_SEED" so nothing pretends to be
a real scrape - provenance_log.robots_check_result is "not_applicable_demo",
which the API/frontend use to show a "demo data" disclosure banner (Phase
2's graceful-fallback pattern, applied to "no live data yet" too).

    python seed_demo_data.py
"""
import random
from datetime import date, timedelta
from pathlib import Path

from app.config import LOCKED_ROUTES as ROUTES, FARE_WINDOWS as WINDOWS
from app.db import get_connection
from app.processing.outliers import flag_outliers
from app.scraping.historical.dgca_ingest import ingest as ingest_dgca
from app.scraping.provenance import record_fare, _get_or_create_route

# ROUTES/WINDOWS now come from app/config.py, the single locked source of
# truth shared with run_live_scrape.py - was a second hardcoded copy here,
# confirmed-locked 2026-09-14 (see Backend/README.md), no reason to drift.
CARRIERS = {"IndiGo": 1.0, "Air India": 1.35}  # Air India ~35% pricier, typical fare spread
BASE_FARE = {("DEL", "BOM"): 5800, ("DEL", "BLR"): 6200, ("BOM", "BLR"): 4500}
DAYS_OF_HISTORY = 45
SEED = 26056  # SIH problem statement number - reproducible, not "random" random


def synth_price(base: float, day_index: int, window_days: int, rng: random.Random) -> float:
    """Mild upward drift (fares creep up closer to travel) + daily noise."""
    drift = 1.0 + 0.004 * (30 - window_days) / 30 * (day_index / DAYS_OF_HISTORY)
    noise = rng.uniform(0.96, 1.04)
    return round(base * drift * noise, -1)  # round to nearest 10 rupees


# ponytail: base/tax/fees split is a fixed, documented approximation
# (typical Indian domestic OTA proportions), applied only to this already-
# synthetic demo total - NOT a claim about real fare structure. Real
# EaseMyTrip scrapes leave base_fare/tax/fees NULL (parser.py only gets a
# bundled total from the results list; a real split needs a per-fare detail
# page scrape that doesn't exist yet - see Backend/README.md). Split off
# `total` itself (not recomputed independently) so base + tax + fees always
# sums back to exactly total, per the 1.5 acceptance criterion.
def split_fare(total: float) -> tuple[float, float, float]:
    base = round(total * 0.80, 2)
    tax = round(total * 0.15, 2)
    fees = round(total - base - tax, 2)  # remainder, guarantees an exact sum
    return base, tax, fees


def seed_fares(conn) -> dict:
    """Returns {(origin, destination, window_days): [daily_avg_price, ...45]}
    so the caller can build index_values from the same numbers, without a
    second pass over the database."""
    rng = random.Random(SEED)
    today = date.today()
    daily_avg: dict = {}

    for origin, destination in ROUTES:
        base = BASE_FARE[(origin, destination)]
        for window_days in WINDOWS:
            day_prices: list[list[float]] = [[] for _ in range(DAYS_OF_HISTORY)]
            rows = []
            for day_index in range(DAYS_OF_HISTORY):
                scrape_day = today - timedelta(days=DAYS_OF_HISTORY - day_index)
                travel_date = scrape_day + timedelta(days=window_days)
                for carrier, multiplier in CARRIERS.items():
                    price = synth_price(base * multiplier, day_index, window_days, rng)
                    if day_index == DAYS_OF_HISTORY - 3 and carrier == "IndiGo":
                        price *= 2.4  # deliberate spike so MAD flagging has something to catch
                    day_prices[day_index].append(price)
                    rows.append((travel_date, carrier, price))

            fare_ids = [
                record_fare(
                    conn, origin=origin, destination=destination, window_days=window_days,
                    travel_date=travel_date, carrier=carrier, total=price,
                    source_name="DEMO_SEED", source_base_url="internal://demo-seed",
                    source_url="internal://demo-seed", http_status=200,
                    robots_check_result="not_applicable_demo", snapshot_path=None,
                    base_fare=split_fare(price)[0], tax=split_fare(price)[1], fees=split_fare(price)[2],
                )
                for travel_date, carrier, price in rows
            ]
            flags = flag_outliers([price for _, _, price in rows])
            for fid, (is_outlier, mad_score) in zip(fare_ids, flags):
                conn.execute(
                    "UPDATE fares SET is_outlier = ?, mad_score = ? WHERE id = ?",
                    (int(is_outlier), mad_score, fid),
                )
            daily_avg[(origin, destination, window_days)] = [
                sum(day) / len(day) for day in day_prices
            ]
    conn.commit()
    return daily_avg


def seed_index_values(conn, daily_avg: dict) -> None:
    """Per-route, per-window daily index (base = day 0 of the seeded history).
    The cross-route weighted 'headline APIx' is computed on read by the API
    layer (dgca_weight x each route's latest index) - not stored here."""
    today = date.today()
    for (origin, destination, window_days), prices in daily_avg.items():
        route_id = _get_or_create_route(conn, origin, destination)
        base_price = prices[0]
        for day_index in range(1, len(prices)):
            scrape_day = today - timedelta(days=DAYS_OF_HISTORY - day_index)
            index_value = 100.0 * prices[day_index] / base_price
            conn.execute(
                "INSERT INTO index_values (computed_at, route_id, window_days, index_value, base_year) "
                "VALUES (?, ?, ?, ?, ?)",
                (scrape_day.isoformat(), route_id, window_days, index_value, 2024),
            )
    conn.commit()


def seed_backtest_results(conn) -> None:
    """6 illustrative months of aeronex-index vs. dgca-proxy growth rates.
    # ponytail: this is a synthetic series, not derived from the 45-day daily
    seed above (45 days isn't enough real history for a monthly MoM chart
    yet). It exists so /api/v1/backtest and the Back-test screen have
    something real to render today. Replace with actual monthly aggregates
    once enough daily history has accumulated AND Phase 0.1's chosen DGCA
    proxy (highest-fare-bucket %, Parliament Q&A figures, or a cross-source
    consistency check - see AeroNex_Research_Phase_Report.md section 2) is
    wired in for real."""
    from app.processing.backtest import backtest_correlation

    rng = random.Random(SEED)
    months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
    aeronex = [100.0, 102.4, 105.1, 103.6, 108.2, 111.0]
    dgca_proxy = [v * rng.uniform(0.97, 1.03) for v in aeronex]  # correlated w/ noise, not identical

    result = backtest_correlation(aeronex, dgca_proxy)
    for i in range(result["months"]):
        conn.execute(
            "INSERT INTO backtest_results (month, aeronex_growth_rate, dgca_proxy_growth_rate, "
            "correlation_metric, method) VALUES (?, ?, ?, ?, ?)",
            (
                months[i + 1],
                result["aeronex_growth_rate"][i],
                result["dgca_proxy_growth_rate"][i],
                result["correlation_metric"],
                "mom_growth_rate",
            ),
        )
    conn.commit()


if __name__ == "__main__":
    conn = get_connection()
    ingest_dgca(Path(__file__).parent / "app/scraping/historical/sample_dgca_traffic.csv", conn)
    daily_avg = seed_fares(conn)
    seed_index_values(conn, daily_avg)
    seed_backtest_results(conn)

    fare_count = conn.execute("SELECT COUNT(*) c FROM fares").fetchone()["c"]
    outlier_count = conn.execute("SELECT COUNT(*) c FROM fares WHERE is_outlier = 1").fetchone()["c"]
    index_count = conn.execute("SELECT COUNT(*) c FROM index_values").fetchone()["c"]
    backtest_count = conn.execute("SELECT COUNT(*) c FROM backtest_results").fetchone()["c"]
    print(f"Seeded {fare_count} fares ({outlier_count} flagged outliers), "
          f"{index_count} index_values rows, {backtest_count} backtest_results rows "
          f"across {len(ROUTES)} routes x {len(WINDOWS)} windows x {DAYS_OF_HISTORY} days.")
    conn.close()
