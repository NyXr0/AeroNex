"""
Disclosed graceful-fallback mode (Build Order Phase 2, #6/#7) - "IndiGo:
blocked, falling back to EaseMyTrip" as actual code, not a slide.

Only EaseMyTrip is a real, implemented scraper right now (app/scraping/live/
easemytrip.py). The airline-direct sources are listed and marked
implemented=False rather than pretended-away, so the fallback chain and its
disclosure are honest about what's real today and slot in real scrapers
later without changing the calling code.
"""
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Source:
    name: str
    scrape_fn: Callable | None = None  # None = not implemented yet
    implemented: bool = field(init=False)

    def __post_init__(self):
        self.implemented = self.scrape_fn is not None


def _easemytrip_source() -> Source:
    from app.scraping.live.easemytrip import scrape_one_way
    return Source("EaseMyTrip", scrape_one_way)


def default_chain() -> list[Source]:
    """Priority order: try airline-direct sites first (not built yet), then
    the OTA aggregator that IS built. A real IndiGo/Air India scraper slots
    in at the front of this list with no change to scrape_with_fallback."""
    return [
        Source("IndiGo (direct)"),
        Source("Air India (direct)"),
        _easemytrip_source(),
    ]


def scrape_with_fallback(origin: str, destination: str, window_days: int, chain: list[Source] | None = None) -> dict:
    """Tries each source in order; on the first success, returns its result
    plus the full disclosure log. If every source fails or is unimplemented,
    returns a disclosed "no data" result instead of raising - Phase 2 #7's
    "degrade gracefully, never a blank hole" requirement, made structural:
    the caller always gets a dict with a `disclosure` list, never an
    exception it has to guess how to render."""
    chain = chain if chain is not None else default_chain()
    disclosure = []

    for source in chain:
        if not source.implemented:
            disclosure.append({"source": source.name, "status": "not_yet_implemented", "action": "skipped"})
            continue
        try:
            result = source.scrape_fn(origin, destination, window_days)
            disclosure.append({"source": source.name, "status": "ok", "action": "used"})
            return {"ok": True, "source_used": source.name, "disclosure": disclosure, **result}
        except Exception as exc:
            disclosure.append({"source": source.name, "status": "failed", "action": "falling back", "error": str(exc)})
            continue

    disclosure.append({"source": None, "status": "exhausted", "action": "no data available this run"})
    return {"ok": False, "source_used": None, "disclosure": disclosure, "fares": []}


def demo() -> None:
    """Runnable self-check with fake sources - no Playwright/network needed
    to verify the fallback LOGIC itself."""
    def always_fails(o, d, w):
        raise RuntimeError("blocked")

    def succeeds(o, d, w):
        return {"fares": ["fake-fare"], "travel_date": "2026-10-01"}

    # Case 1: first source fails, second succeeds -> disclosed fallback, no crash.
    chain = [Source("IndiGo (direct)", always_fails), Source("EaseMyTrip", succeeds)]
    result = scrape_with_fallback("DEL", "BOM", 1, chain)
    assert result["ok"] is True
    assert result["source_used"] == "EaseMyTrip"
    assert result["disclosure"][0]["status"] == "failed"
    assert result["disclosure"][1]["status"] == "ok"

    # Case 2: every source fails/unimplemented -> disclosed "no data", not an exception.
    chain2 = [Source("IndiGo (direct)"), Source("Air India (direct)", always_fails)]
    result2 = scrape_with_fallback("DEL", "BOM", 1, chain2)
    assert result2["ok"] is False
    assert result2["fares"] == []
    assert result2["disclosure"][-1]["status"] == "exhausted"

    print(f"OK - fallback used {result['source_used']} after 1 failure; "
          f"all-fail case disclosed {len(result2['disclosure'])} attempts without raising")


if __name__ == "__main__":
    demo()
