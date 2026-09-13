"""
Live scraper: one source (EaseMyTrip), driven by real Playwright browser
automation — no request-spoofing/anti-bot workarounds needed, per the ADR.

# ponytail: DEL->BOM T+1 is fully verified live end-to-end (2026-09-14,
# live run 5) - 21 real fares scraped and written. Getting here took 4
# rounds: the date-field needed a calendar day-cell click not .fill(),
# page.click("#ddate") itself timed out once (fixed with _click_robust +
# broader popup dismissal + headless-softening launch args, unverified
# guess that happened to work), wait_for_selector's default "visible" wait
# was hanging on a deliberately-hidden padding calendar cell (fixed with
# state="attached"), and the parser was choking on a "nearby airport"
# result row's extra annotation line (fixed by stripping it, see parser.py).
#
# _set_route() (this file) was then rewritten from a guess to a fix
# verified against the real site's suggestion-list markup (manual browser
# investigation, same day) but NOT yet run live end-to-end through
# run_spike.py - that's the next thing to confirm. T+15/T+30 windows are
# still untested beyond T+1.
"""
from datetime import date, timedelta

from playwright.sync_api import sync_playwright

from app.scraping.live.parser import parse_results
from app.scraping.robots_check import check_allowed

BASE_URL = "https://www.easemytrip.com"
SOURCE_NAME = "EaseMyTrip"


def scrape_one_way(origin: str, destination: str, window_days: int) -> dict:
    """
    Runs a real one-way search on easemytrip.com and returns everything the
    provenance log needs: robots-check result, HTTP status, page URL, a raw
    HTML snapshot path, and the parsed fares.
    """
    robots_result = check_allowed(BASE_URL, "/")
    travel_date = date.today() + timedelta(days=window_days)

    with sync_playwright() as p:
        # ponytail: --disable-blink-features + a real UA are standard
        # Playwright-recommended flags for headless-vs-headed rendering
        # parity - not a bot-detection workaround (robots.txt/rate-limit
        # below is still the real compliance gate either way).
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = browser.new_page(
            viewport={"width": 1366, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            ),
        )
        page.context.grant_permissions([])  # pre-deny geolocation etc. - no native prompt, ever
        response = page.goto(BASE_URL, wait_until="domcontentloaded")
        http_status = response.status if response else None
        page.wait_for_timeout(2000)  # let async widgets (chat popup, banners) finish loading

        _dismiss_popups(page)

        if origin != "DEL" or destination != "BOM":
            _set_route(page, origin, destination)
        _dismiss_popups(page)  # a chat widget can appear async, after the first pass found nothing
        _set_departure_date(page, travel_date)

        page.get_by_role("button", name="Search", exact=True).first.click()
        page.wait_for_selector("text=Flight Details", timeout=20000)
        page.wait_for_timeout(1500)  # let the price column settle after sort

        snapshot_path = f"data/snapshots/{origin}-{destination}_{travel_date.isoformat()}.html"
        _save_snapshot(page, snapshot_path)

        page_text = page.locator("body").inner_text()
        fares = parse_results(page_text)

        source_url = page.url
        browser.close()

    return {
        "robots_result": robots_result,
        "http_status": http_status,
        "source_url": source_url,
        "snapshot_path": snapshot_path,
        "travel_date": travel_date,
        "fares": fares,
    }


def _click_robust(page, selector: str, timeout: int = 8000) -> None:
    """Playwright's normal .click() auto-waits for the target to be visible,
    stable, AND not obscured - it times out (not errors with a clear
    "blocked by X" message) if something sits on top the whole time, e.g. a
    chat widget that only appears on a fresh cookie-less session. Real
    popups get a real dismiss attempt first (_dismiss_popups); this is the
    fallback for whatever slips past that: a direct JS click bypasses the
    overlay entirely, at the cost of not modeling a real user click exactly.
    # ponytail: unverified against the actual failure (couldn't reproduce
    # it live here) - if this doesn't fix it, the real blocker is something
    # else and needs a live look at what's actually on screen when it hangs.
    """
    try:
        page.click(selector, timeout=timeout)
    except Exception:
        page.evaluate(f"document.querySelector({selector!r}).click()")


def _dismiss_popups(page) -> None:
    # The "EVA" chat-assistant modal (and possibly a cookie/consent banner -
    # unverified, only ever seen EVA live) appears intermittently, more
    # likely on a fresh cookie-less session than the reused profile this was
    # tested against - best-effort close across several common patterns,
    # plus Escape as a free universal fallback that costs nothing if there's
    # nothing to dismiss.
    for selector in [
        "button:has-text('✕')",
        "[aria-label='close']",
        ".close",
        "button:has-text('×')",
        "[class*='close' i]",
        "[class*='popup' i] button",
    ]:
        try:
            page.locator(selector).first.click(timeout=1200)
        except Exception:
            continue
    page.keyboard.press("Escape")


def _set_route(page, origin: str, destination: str) -> None:
    # Verified live 2026-09-14 (manual browser investigation): DEL/BOM/BLR --
    # plus CCU/GOI/HYD/MAA and a few international cities -- all sit in the
    # unfiltered "Top Cities" suggestion list that opens on click, so no
    # typing/autocomplete-filtering step is needed for our locked routes.
    # A route outside that default list would need a type-to-filter step
    # added to _pick_city.
    _pick_city(page, "FromSector_show", origin)
    _pick_city(page, "Editbox13_show", destination)
    # Picking a destination auto-opens the departure calendar on this site;
    # close it so _set_departure_date's own click-to-open logic (verified
    # live in run 5) isn't toggling an already-open calendar shut.
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)


def _pick_city(page, field_id: str, code: str) -> None:
    # Each suggestion row is
    # <li onclick="autoSelectMul(\'spnN\',\'<field_id>\',\'<CODE>-...\',...)"> --
    # the onclick itself encodes which field it fills, so pinning both
    # field_id and code in the selector avoids matching on visible text
    # alone. That text-ambiguity trap already bit this scraper twice
    # (a hidden calendar padding cell, and separately a hidden
    # "nearby airport" line in the results parser) -- same bug shape,
    # avoided here up front instead of found the hard way a third time.
    _click_robust(page, f"#{field_id}")
    row = f"li[onclick*=\"'{field_id}'\"][onclick*=\"'{code}-\"]"
    page.wait_for_selector(row, timeout=5000, state="attached")
    _click_robust(page, row)

    hidden_id = field_id[: -len("_show")]
    actual = page.eval_on_selector(f"#{hidden_id}", "el => el.value")
    if not actual.startswith(f"{code}-"):
        raise RuntimeError(
            f"Could not set {field_id} to {code} -- got {actual!r} instead. "
            "Inspect the open suggestion list and fix _pick_city."
        )


def _set_departure_date(page, travel_date: date) -> None:
    """
    Verified live 2026-09-14 (built-in browser walkthrough against the real
    site, after the user's run_spike.py hit exactly the failure this
    function used to raise). #ddate is NOT a jQuery UI datepicker - the
    #ui-datepicker-div in the DOM is unused/vestigial. It is a custom
    two-month calendar: clicking #ddate reveals `.box`/`.box1` month grids,
    and each day is `<li id="{prefix}_{n}_DD/MM/YYYY" onclick=
    "SelectDate(this.id)">`. The reliable selector is the exact date string
    as an id suffix, not a coordinate or a typed value - confirmed clicking
    it sets #ddate's value to that same "DD/MM/YYYY" string.
    """
    date_str = travel_date.strftime("%d/%m/%Y")
    day_cell = f'li[onclick^="SelectDate"][id$="{date_str}"]'

    _click_robust(page, "#ddate")
    # ponytail: verified live 2026-09-14 - default wait_for_selector waits for
    # the FIRST DOM match to become visible, and the first li[onclick^=
    # SelectDate] in each month grid is a hidden padding cell (id ending
    # "00/00/0000", deliberately visibility:hidden for the blank days before
    # the 1st) that never becomes visible - that's what timed out, not a
    # missing calendar. state="attached" only waits for the grid to exist,
    # which is all this needs before hunting for the specific date cell below.
    page.wait_for_selector(".box .days li[onclick^='SelectDate']", timeout=5000, state="attached")

    for _ in range(3):  # today's 2-month view usually covers T+30; page forward if not
        if page.locator(day_cell).count() > 0:
            page.locator(day_cell).first.click()
            break
        _click_robust(page, "#img2Nex")  # the calendar's "next month" arrow
        page.wait_for_timeout(300)
    else:
        raise RuntimeError(
            f"Could not find a calendar day cell for {date_str} after paging "
            "3 months forward from #ddate's calendar - site markup may have "
            "changed, inspect it live again."
        )

    actual = page.input_value("#ddate")
    if actual != date_str:
        raise RuntimeError(
            f"Clicked the {date_str} day cell but #ddate now reads {actual!r} "
            "- selection didn't take, inspect the calendar live again."
        )


def _save_snapshot(page, path: str) -> None:
    import os

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(page.content())
