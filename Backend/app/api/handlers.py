"""
Handler functions for the 7 endpoints in AeroNex_Architecture.md's API table.
Each returns a plain JSON-serializable dict - deliberately framework-free so
swapping the stdlib server.py for a real FastAPI app later means wrapping
these same functions in @router.get(...), not rewriting them.
"""
import json
from pathlib import Path

from app.config import LOCKED_ROUTES, FARE_WINDOWS as LOCKED_WINDOWS
from app.db import get_connection

DISCLOSURE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "last_disclosure.json"

# LOCKED_ROUTES/LOCKED_WINDOWS now come from app/config.py - this was a
# second hardcoded copy (found while wiring in the confirmed lock), which is
# exactly the drift app/config.py exists to prevent.

METHODOLOGY_TEXT = {
    "index_construction": (
        "Fixed-weight, price-relative index (a Laspeyres-style simplification of "
        "a full Fisher index - a true Fisher index needs current-period expenditure "
        "quantities, which no public source, including DGCA, publishes for airfares). "
        "For route r in a window w: relative_r = price_today_r / price_base_r. "
        "Route weights come from each route's share of DGCA-published monthly "
        "passenger traffic (routes.dgca_weight). Index = 100 x sum(weight_r x relative_r) / sum(weight_r)."
    ),
    "base_period": "2024 (index = 100.0 at base).",
    "windows": "T+1, T+15, T+30 days advance purchase - the 3 windows in Phase 1's locked scope.",
    "outlier_detection": (
        "MAD (median absolute deviation), not z-score/3-sigma: modified z-score "
        "0.6745 x (x - median) / MAD, flagged when |score| > 3.5 (Iglewicz & Hoaglin). "
        "Chosen because scraped fare series are right-skewed by a handful of "
        "premium/last-minute fares, which distorts a mean-based z-score."
    ),
    "backtest_method": (
        "Month-over-month growth-rate correlation (not raw-level correlation) between "
        "AeroNex's index and a DGCA-derived proxy, because DGCA does not publish a "
        "clean average-fare series (only traffic/load-factor data) - see the Phase 0.1 "
        "research spike. The proxy and this comparison are explicitly monthly vs. "
        "AeroNex's daily granularity; that frequency mismatch is stated up front, not "
        "hidden."
    ),
    "compliance": (
        "Every live-scraped fare passes through a robots.txt check before the request "
        "is made and is logged with source URL, HTTP status, and a raw snapshot "
        "(app/scraping/provenance.py). Historical/DGCA ingestion has no scraping-"
        "compliance question - it parses documents that are already public."
    ),
}


def get_index(conn=None) -> dict:
    """GET /api/v1/index - headline APIx + per-route pressure (latest daily index per route)."""
    own = conn is None
    conn = conn or get_connection()
    try:
        routes = conn.execute("SELECT id, origin, destination, dgca_weight FROM routes").fetchall()
        pressure = []
        weighted_sum, weight_total = 0.0, 0.0
        for r in routes:
            latest = conn.execute(
                "SELECT index_value, window_days, computed_at FROM index_values "
                "WHERE route_id = ? ORDER BY computed_at DESC LIMIT 1",
                (r["id"],),
            ).fetchone()
            if latest is None:
                continue
            w = r["dgca_weight"] or 0.0
            pressure.append({
                "route": f"{r['origin']}-{r['destination']}",
                "index_value": round(latest["index_value"], 2),
                "window_days": latest["window_days"],
                "dgca_weight": w,
            })
            weighted_sum += w * latest["index_value"]
            weight_total += w
        headline = round(weighted_sum / weight_total, 2) if weight_total > 0 else None
        return {"headline_index": headline, "base_year": 2024, "per_route": pressure}
    finally:
        if own:
            conn.close()


def get_index_history(route_id: int, window_days: int, conn=None) -> dict:
    """GET /api/v1/index/history - time series for one route/window."""
    own = conn is None
    conn = conn or get_connection()
    try:
        rows = conn.execute(
            "SELECT computed_at, index_value FROM index_values "
            "WHERE route_id = ? AND window_days = ? ORDER BY computed_at ASC",
            (route_id, window_days),
        ).fetchall()
        return {"route_id": route_id, "window_days": window_days,
                "series": [{"date": r["computed_at"], "index_value": round(r["index_value"], 2)} for r in rows]}
    finally:
        if own:
            conn.close()


def _lead_time_curve(conn, route_id: int) -> list[dict]:
    """Avg fare + sample size per locked window for one route - shared by
    get_route_detail (single route) and get_windows_overview (all routes),
    so the T+1/T+15/T+30 query lives in exactly one place."""
    curve = []
    for window_days in LOCKED_WINDOWS:
        row = conn.execute(
            "SELECT AVG(total) AS avg_total, COUNT(*) AS n FROM fares "
            "WHERE route_id = ? AND window_days = ? AND is_outlier = 0",
            (route_id, window_days),
        ).fetchone()
        curve.append({
            "window_days": window_days,
            "avg_total": round(row["avg_total"], 2) if row["avg_total"] else None,
            "sample_size": row["n"],
        })
    return curve


def _fare_composition(conn, route_id: int) -> dict | None:
    """Avg base/tax/fees/total across a route's non-outlier fares - the
    1.5 'fare structure breakdown' requirement (base + tax + fees = total,
    never a single bundled number).

    base_fare/tax/fees are only ever non-NULL on DEMO_SEED rows right now -
    real EaseMyTrip scrapes only expose a bundled total (parser.py has no
    per-fare detail-page scrape yet, see Backend/README.md) - so this is
    filtered to rows that actually have the split, and `is_demo_estimate`
    tells the frontend whether that's demo-only so it can caption honestly
    instead of presenting a synthetic split as real."""
    row = conn.execute(
        "SELECT AVG(f.base_fare) AS base, AVG(f.tax) AS tax, AVG(f.fees) AS fees, "
        "AVG(f.total) AS total, COUNT(*) AS n, "
        "SUM(CASE WHEN s.name != 'DEMO_SEED' THEN 1 ELSE 0 END) AS real_n "
        "FROM fares f JOIN sources s ON s.id = f.source_id "
        "WHERE f.route_id = ? AND f.is_outlier = 0 AND f.base_fare IS NOT NULL",
        (route_id,),
    ).fetchone()
    if row["n"] == 0 or row["total"] is None:
        return None
    return {
        "base": round(row["base"], 2),
        "tax": round(row["tax"], 2),
        "fees": round(row["fees"], 2),
        "total": round(row["total"], 2),
        "currency": "INR",
        "sample_size": row["n"],
        "is_demo_estimate": row["real_n"] == 0,
    }


def get_route_detail(route_id: int, conn=None) -> dict | None:
    """GET /api/v1/routes/{id} - fare composition + lead-time curve."""
    own = conn is None
    conn = conn or get_connection()
    try:
        route = conn.execute("SELECT * FROM routes WHERE id = ?", (route_id,)).fetchone()
        if route is None:
            return None
        by_carrier = conn.execute(
            "SELECT carrier, AVG(total) AS avg_total, COUNT(*) AS n FROM fares "
            "WHERE route_id = ? AND is_outlier = 0 GROUP BY carrier",
            (route_id,),
        ).fetchall()
        return {
            "route": f"{route['origin']}-{route['destination']}",
            "dgca_weight": route["dgca_weight"],
            "lead_time_curve": _lead_time_curve(conn, route_id),
            "fare_composition": _fare_composition(conn, route_id),
            "fare_by_carrier": [
                {"carrier": r["carrier"], "avg_total": round(r["avg_total"], 2), "sample_size": r["n"]}
                for r in by_carrier
            ],
        }
    finally:
        if own:
            conn.close()


def get_routes(conn=None) -> dict:
    """GET /api/v1/routes - the locked route list (id + label + weight), for
    frontend route selectors (Price Trend, T-Windows, Fare Breakdown)."""
    own = conn is None
    conn = conn or get_connection()
    try:
        routes = []
        for origin, destination in LOCKED_ROUTES:
            r = conn.execute(
                "SELECT id, dgca_weight FROM routes WHERE origin = ? AND destination = ?",
                (origin, destination),
            ).fetchone()
            if r is None:
                continue
            routes.append({"id": r["id"], "route": f"{origin}-{destination}", "dgca_weight": r["dgca_weight"]})
        return {"routes": routes, "windows": LOCKED_WINDOWS}
    finally:
        if own:
            conn.close()


def get_windows_overview(conn=None) -> dict:
    """GET /api/v1/windows - T+1/T+15/T+30 avg fare per locked route, side by
    side - the same lead-time curve get_route_detail returns, just for all
    3 routes at once instead of forcing 3 separate requests."""
    own = conn is None
    conn = conn or get_connection()
    try:
        routes = []
        for origin, destination in LOCKED_ROUTES:
            r = conn.execute(
                "SELECT id, dgca_weight FROM routes WHERE origin = ? AND destination = ?",
                (origin, destination),
            ).fetchone()
            if r is None:
                continue
            routes.append({
                "route_id": r["id"],
                "route": f"{origin}-{destination}",
                "dgca_weight": r["dgca_weight"],
                "lead_time_curve": _lead_time_curve(conn, r["id"]),
            })
        return {"windows": LOCKED_WINDOWS, "routes": routes}
    finally:
        if own:
            conn.close()


# Cited once, checked against MoSPI's actual June 2026 CPI release (Annexure
# II) in Brain/AeroNex_Buildlist_Technical_Addendum.md - MoSPI does not
# publish an air-transport-only line, so this is honestly the broader
# "Passenger transport services" class (air/rail/bus/taxi/auto bundled),
# not a fictional "Air Transport CPI". Static because it's a monthly
# official release, not something to re-derive per request.
MOSPI_CPI_REFERENCE = {
    "series_name": "Passenger transport services",
    "value": 105.01,
    "as_of": "2026-06",
    "base_year": 2024,
    "note": (
        "MoSPI does not publish an air-transport-only CPI sub-index; this is the "
        "broader passenger-transport-services class (air/rail/bus/taxi/auto), of "
        "which air travel is one component."
    ),
}


def get_cpi_linkage(conn=None) -> dict:
    """GET /api/v1/cpi-linkage - AeroNex's own headline-index history next to
    the one real, published MoSPI reference point (see MOSPI_CPI_REFERENCE).

    Deliberately NOT a computed correlation like /api/v1/backtest - that
    already does the real growth-rate-correlation work against a DGCA proxy
    with enough monthly history to mean something. MoSPI publishes one
    reference figure a month; pretending to correlate that against a few
    weeks of AeroNex data would be exactly the false-precision overclaim
    this project is positioned against. This is a reference-point comparison,
    captioned as such, not a statistical validation."""
    own = conn is None
    conn = conn or get_connection()
    try:
        route_ids = []
        weights = {}
        for origin, destination in LOCKED_ROUTES:
            r = conn.execute(
                "SELECT id, dgca_weight FROM routes WHERE origin = ? AND destination = ?",
                (origin, destination),
            ).fetchone()
            if r is not None:
                route_ids.append(r["id"])
                weights[r["id"]] = r["dgca_weight"] or 0.0

        if not route_ids:
            return {"mospi_reference": MOSPI_CPI_REFERENCE, "aeronex_history": []}

        placeholders = ",".join("?" * len(route_ids))
        rows = conn.execute(
            f"SELECT computed_at, route_id, AVG(index_value) AS avg_index FROM index_values "
            f"WHERE route_id IN ({placeholders}) GROUP BY computed_at, route_id "
            f"ORDER BY computed_at ASC",
            route_ids,
        ).fetchall()

        by_date: dict[str, dict[int, float]] = {}
        for r in rows:
            by_date.setdefault(r["computed_at"], {})[r["route_id"]] = r["avg_index"]

        history = []
        for computed_at, per_route in by_date.items():
            weight_total = sum(weights[rid] for rid in per_route)
            if weight_total <= 0:
                continue
            weighted = sum(weights[rid] * val for rid, val in per_route.items()) / weight_total
            history.append({"date": computed_at, "headline_index": round(weighted, 2)})

        return {"mospi_reference": MOSPI_CPI_REFERENCE, "aeronex_history": history}
    finally:
        if own:
            conn.close()


def get_compliance(conn=None) -> dict:
    """GET /api/v1/compliance - per-source status + latest provenance sample,
    plus the most recent disclosed-fallback attempt log (Build Order Phase 2,
    #6) if a live run has produced one - see app/scraping/live/sources.py."""
    own = conn is None
    conn = conn or get_connection()
    try:
        sources = conn.execute("SELECT * FROM sources").fetchall()
        result = []
        for s in sources:
            latest = conn.execute(
                "SELECT p.source_url, p.http_status, p.robots_check_result, p.scraped_at "
                "FROM provenance_log p JOIN fares f ON f.id = p.fare_id "
                "WHERE f.source_id = ? ORDER BY p.scraped_at DESC LIMIT 1",
                (s["id"],),
            ).fetchone()
            result.append({
                "source": s["name"],
                "base_url": s["base_url"],
                "robots_status": s["robots_status"],
                "last_checked_at": s["last_checked_at"],
                "latest_provenance": dict(latest) if latest else None,
            })

        fallback_log = None
        if DISCLOSURE_PATH.exists():
            try:
                fallback_log = json.loads(DISCLOSURE_PATH.read_text())
            except (json.JSONDecodeError, OSError):
                fallback_log = None  # a demo server must degrade, not 500, on a corrupt sidecar file

        return {"sources": result, "latest_fallback_log": fallback_log}
    finally:
        if own:
            conn.close()


def get_backtest(conn=None) -> dict:
    """GET /api/v1/backtest - AeroNex vs. DGCA-proxy growth-rate series + correlation."""
    own = conn is None
    conn = conn or get_connection()
    try:
        rows = conn.execute(
            "SELECT month, aeronex_growth_rate, dgca_proxy_growth_rate, correlation_metric, method "
            "FROM backtest_results ORDER BY month ASC"
        ).fetchall()
        return {
            "caveat": "AeroNex is daily; the DGCA-derived proxy is monthly - growth rates are "
                      "compared month-over-month specifically to make that frequency gap honest, not hidden.",
            "series": [dict(r) for r in rows],
        }
    finally:
        if own:
            conn.close()


def get_methodology() -> dict:
    """GET /api/v1/methodology - static content."""
    return METHODOLOGY_TEXT


def get_coverage(conn=None) -> dict:
    """GET /api/v1/coverage - route x window matrix, real vs. roadmap."""
    own = conn is None
    conn = conn or get_connection()
    try:
        all_routes = conn.execute("SELECT origin, destination, dgca_weight FROM routes "
                                   "ORDER BY dgca_weight DESC").fetchall()
        matrix = []
        for r in all_routes:
            route_key = (r["origin"], r["destination"])
            matrix.append({
                "route": f"{r['origin']}-{r['destination']}",
                "dgca_weight": r["dgca_weight"],
                "cells": {
                    str(w): (route_key in LOCKED_ROUTES and w in LOCKED_WINDOWS)
                    for w in [1, 7, 15, 30, 45]
                },
            })
        return {"locked_routes": [f"{o}-{d}" for o, d in LOCKED_ROUTES],
                "locked_windows": LOCKED_WINDOWS, "matrix": matrix}
    finally:
        if own:
            conn.close()
