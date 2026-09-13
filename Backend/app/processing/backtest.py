"""
30-day/MoM back-test vs. DGCA proxy (Build Order Phase 3.9). Growth-rate
correlation, not raw-level correlation, per the Technical Addendum's
'mom_growth_rate' method - this also sidesteps needing the two series on the
same base/scale.

# ponytail: DGCA doesn't publish a clean average-fare series (Phase 0.1
# finding), so "dgca_proxy_growth_rate" is whatever honest proxy the
# research doc's Section 2 lands on (highest-fare-bucket %, or an internal
# cross-source consistency check) - this module just does the growth-rate
# math on two aligned series, it doesn't pick the proxy.
"""
import statistics


def mom_growth_rates(monthly_values: list[float]) -> list[float]:
    """Month-over-month % growth: [(v1-v0)/v0, (v2-v1)/v1, ...]. Needs >=2 points."""
    if len(monthly_values) < 2:
        raise ValueError("need at least 2 monthly values to compute a growth rate")
    return [
        (monthly_values[i] - monthly_values[i - 1]) / monthly_values[i - 1]
        for i in range(1, len(monthly_values))
    ]


def backtest_correlation(aeronex_monthly: list[float], dgca_proxy_monthly: list[float]) -> dict:
    """Returns {aeronex_growth_rate, dgca_proxy_growth_rate, correlation_metric}
    per month (aligned, 1-indexed from the 2nd input month), plus the overall
    Pearson correlation across the whole series."""
    if len(aeronex_monthly) != len(dgca_proxy_monthly):
        raise ValueError("both series must cover the same months")

    a_growth = mom_growth_rates(aeronex_monthly)
    d_growth = mom_growth_rates(dgca_proxy_monthly)

    if len(set(a_growth)) < 2 or len(set(d_growth)) < 2:
        correlation = 0.0  # statistics.correlation needs variance in both series
    else:
        correlation = statistics.correlation(a_growth, d_growth)

    return {
        "months": len(a_growth),
        "aeronex_growth_rate": a_growth,
        "dgca_proxy_growth_rate": d_growth,
        "correlation_metric": correlation,
    }


def demo() -> None:
    aeronex = [100, 103, 101, 108, 112, 110]
    dgca_proxy = [50, 51.5, 50.5, 54, 56, 55]  # scaled +noise-free copy -> should correlate ~1.0

    result = backtest_correlation(aeronex, dgca_proxy)
    assert result["months"] == 5
    assert result["correlation_metric"] > 0.99, f"expected near-perfect correlation, got {result['correlation_metric']}"

    flat = backtest_correlation([100, 100, 100], [50, 50, 50])
    assert flat["correlation_metric"] == 0.0, "zero-variance series must not crash statistics.correlation"

    print(f"OK - correlation={result['correlation_metric']:.4f} over {result['months']} months")


if __name__ == "__main__":
    demo()
