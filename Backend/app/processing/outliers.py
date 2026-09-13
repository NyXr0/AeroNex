"""
MAD-based outlier detection (Build Order Phase 3.8) - swapped in for a naive
z-score/3-sigma check because fare distributions are skewed by a handful of
premium/last-minute fares; MAD is robust to exactly that.

Modified z-score (Iglewicz & Hoaglin): 0.6745 * (x - median) / MAD.
|score| > 3.5 is the standard flagging threshold.
"""
import statistics


def flag_outliers(values: list[float], threshold: float = 3.5) -> list[tuple[bool, float]]:
    """Returns [(is_outlier, mad_score), ...] aligned to `values`.
    mad_score is the modified z-score (signed); NaN-free by construction."""
    if len(values) < 2:
        return [(False, 0.0) for _ in values]

    med = statistics.median(values)
    mad = statistics.median([abs(v - med) for v in values])

    if mad == 0:
        # All values identical (or all-but-ties): nothing is an outlier.
        return [(False, 0.0) for _ in values]

    scores = [0.6745 * (v - med) / mad for v in values]
    return [(abs(s) > threshold, s) for s in scores]


def demo() -> None:
    """Runnable self-check: one obvious outlier, rest clustered."""
    fares = [5800, 5950, 6100, 6050, 5900, 21000, 6000]  # index 5 is a clear outlier
    results = flag_outliers(fares)

    assert len(results) == len(fares)
    flags = [is_out for is_out, _ in results]
    assert flags[5] is True, "the 21000 fare must be flagged"
    assert sum(flags) == 1, f"expected exactly 1 outlier, got {sum(flags)}: {flags}"

    # Identical values -> no division by zero, nothing flagged.
    flat = flag_outliers([100.0, 100.0, 100.0])
    assert all(not is_out for is_out, _ in flat)

    print(f"OK - flagged {sum(flags)}/{len(fares)} as outlier, mad_score={results[5][1]:.2f}")


if __name__ == "__main__":
    demo()
