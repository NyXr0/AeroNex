"""
Airfare price index (Build Order Phase 3.9 support code).

# ponytail: the architecture doc names this "Fisher index construction" -
# a true Fisher index needs current-period *quantities* (expenditure shares)
# per route/window, which nothing in this pipeline collects (DGCA doesn't
# publish that either, per the Phase 0.1 research spike). What IS honestly
# buildable from what we actually scrape is a fixed-weight Laspeyres-style
# index: route weights come from DGCA traffic share (routes.dgca_weight),
# prices come from our own scraped fares. That's what this computes. Ship
# this, name it accurately on the methodology page, upgrade to a real
# Fisher/Tornqvist calc if/when a quantity signal exists - don't claim more
# than the data supports.
"""
import statistics
from datetime import date


def price_relative_index(
    route_prices: dict[tuple, float],
    base_prices: dict[tuple, float],
    weights: dict[tuple, float],
    base_value: float = 100.0,
) -> float:
    """route_prices/base_prices/weights are all keyed the same way (e.g. by
    route id, or (route_id, window_days)). Missing a base price for a key
    that has a current price skips that key (can't compute a relative
    without a base) rather than crashing the whole index."""
    usable_keys = [k for k in route_prices if k in base_prices and base_prices[k] > 0]
    if not usable_keys:
        raise ValueError("no overlapping route/base prices to index")

    total_weight = sum(weights.get(k, 0.0) for k in usable_keys)
    if total_weight == 0:
        # No DGCA weights available yet -> equal-weight fallback, not a crash.
        total_weight = len(usable_keys)
        weights = {k: 1.0 for k in usable_keys}

    weighted_sum = sum(
        weights.get(k, 0.0) * (route_prices[k] / base_prices[k]) for k in usable_keys
    )
    return base_value * weighted_sum / total_weight


def demo() -> None:
    base = {"DEL-BOM": 6000.0, "DEL-BLR": 5500.0, "BOM-BLR": 4800.0}
    weights = {"DEL-BOM": 0.5, "DEL-BLR": 0.3, "BOM-BLR": 0.2}

    same = price_relative_index(base, base, weights)
    assert abs(same - 100.0) < 1e-9, "index vs itself must be exactly the base value"

    up_10pct = {k: v * 1.10 for k, v in base.items()}
    grown = price_relative_index(up_10pct, base, weights)
    assert abs(grown - 110.0) < 1e-6, f"uniform +10% must give index 110, got {grown}"

    partial = {"DEL-BOM": 6600.0, "DEL-BLR": 5500.0}  # BOM-BLR missing this period
    mixed = price_relative_index(partial, base, weights)
    assert 100.0 < mixed < 110.0, "partial coverage (one route +10%, one flat) must fall strictly between"

    print(f"OK - base->110% index: {grown:.2f}, partial-coverage index: {mixed:.2f}")


if __name__ == "__main__":
    demo()
