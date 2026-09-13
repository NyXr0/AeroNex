"""
Compliance-first scraping: check robots.txt before every request.

Verified against the real https://www.easemytrip.com/robots.txt on 2026-09-13:
the search flow used here happens on "/" (the homepage SPA), which is not
disallowed — "/flight-search/listing*" is, so this scraper must never hit
that path directly.
"""
from urllib.robotparser import RobotFileParser


def check_allowed(base_url: str, path: str, user_agent: str = "AeroNexBot") -> str:
    """Returns "allowed" or "disallowed". Fails closed: any fetch/parse error -> "disallowed"."""
    rp = RobotFileParser()
    rp.set_url(base_url.rstrip("/") + "/robots.txt")
    try:
        rp.read()
    except Exception:
        return "disallowed"
    return "allowed" if rp.can_fetch(user_agent, path) else "disallowed"
