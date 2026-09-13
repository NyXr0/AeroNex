"""
Parses EaseMyTrip's flight-results text block into structured rows.

Row shape verified against the real site on 2026-09-13 (DEL->BOM, one-way).
Each result renders as (blank lines included, non-deterministic count):

    IndiGo
    6E- 303
    20:00
    New Delhi(DEL)
    <blank line(s)>
    02h 10m
    <blank line(s)>
    Nonstop
    22:10
    Mumbai(BOM)
    ₹6,530
    Book Now
    2 Seats Left        <- optional, only shown on low-inventory flights
    BOOKNOW: Get extra Rs.220 instant discount on this flight   <- optional promo
    Flight Details

Text-based, not CSS-class-based: OTA class names are unstable/hashed, but the
row's *shape* (10 fixed fields, "Book Now" then "Flight Details" as row
delimiters) is what a Playwright script can actually rely on.

# ponytail: verified live 2026-09-14 (DEL->BOM T+1, real run) - a "nearby
# airport" result inserts an extra line right after origin_raw and/or
# dest_raw, e.g.:
#     Ghaziabad(HDO)
#     (28 km from New Delhi)
# The original 2026-09-13 captured sample happened to have zero nearby-
# airport rows, so this never showed up in the self-check even though it's
# common (most of a real result page can be nearby-airport rows). Stripped
# out alongside blank lines below - restores the fixed 9-field shape
# regardless of how many annotations a row has.
#
# ponytail: verified live 2026-09-14 (DEL->BLR T+1, real run) - some rows
# (Air India/Air India Express, seen live) carry a leading perk badge line
# BEFORE the airline name, e.g. "Enjoy Free Meals" right after the previous
# row's "Flight Details". That shifts where the row's 9 fields start, which
# broke the old fixed-offset parser (assumed field 1 always sat right after
# the previous delimiter). Fixed by anchoring on "Book Now" instead - it's
# the one line every row has that badges never touch, so the 9 fields
# immediately before it are the row, however much badge/promo text came
# before. A row that still doesn't match after that (unknown future badge
# shape) is now skipped rather than aborting the whole remaining table.
"""
import re
from dataclasses import dataclass

ROUTE_RE = re.compile(r"^(.+?)\(([A-Z]{3})\)$")
DURATION_RE = re.compile(r"^\d{2}h \d{2}m$")
TIME_RE = re.compile(r"^\d{2}:\d{2}$")
PRICE_RE = re.compile(r"^₹([\d,]+)$")
SEATS_RE = re.compile(r"(\d+)\s+Seats Left")
NEARBY_AIRPORT_RE = re.compile(r"^\(\d+\s*km from .+\)$")  # "(24 km from Mumbai)" etc.


@dataclass
class ParsedFare:
    airline: str
    flight_no: str
    dep_time: str
    origin_code: str
    duration: str
    stops: str
    arr_time: str
    dest_code: str
    price: float
    seats_left: int | None


def parse_results(page_text: str) -> list[ParsedFare]:
    lines = [ln.strip() for ln in page_text.splitlines()]
    # Drop blank lines and nearby-airport annotations - both are optional,
    # variable-count noise around the fixed 9-field row shape (see the
    # module docstring's ponytail note on the annotation).
    lines = [ln for ln in lines if ln and not NEARBY_AIRPORT_RE.match(ln)]

    # Results table starts right after this header row, emitted once by the page.
    header = ["AIRLINES", "DEPARTURE", "DURATION", "ARRIVE", "PRICE"]
    start = None
    for i in range(len(lines) - len(header)):
        if lines[i : i + len(header)] == header:
            start = i + len(header)
            break
    if start is None:
        return []

    fares: list[ParsedFare] = []
    i = start
    while i < len(lines):
        # Anchor on "Book Now" rather than assuming the row's 9 fields start
        # exactly at `i` - a leading perk badge (e.g. "Enjoy Free Meals")
        # can sit before the airline name and shift that start. "Book Now"
        # is untouched by badges, so the 9 fields immediately before it are
        # always the row, regardless of what text came earlier.
        try:
            book_now = lines.index("Book Now", i)
        except ValueError:
            break  # no more rows on the page

        if book_now - 9 < i:
            break  # not enough lines left for a full row before this delimiter

        row_start = book_now - 9
        airline, flight_no, dep_time, origin_raw, duration, stops, arr_time, dest_raw, price_raw = lines[row_start:book_now]

        origin_m = ROUTE_RE.match(origin_raw)
        dest_m = ROUTE_RE.match(dest_raw)
        price_m = PRICE_RE.match(price_raw)
        if not (TIME_RE.match(dep_time) and TIME_RE.match(arr_time) and DURATION_RE.match(duration) and origin_m and dest_m and price_m):
            # An unrecognized field shape right before a real "Book Now" -
            # skip just this row rather than aborting every row after it.
            i = book_now + 1
            continue

        j = book_now + 1
        seats_left = None
        while j < len(lines) and lines[j] != "Flight Details":
            seats_m = SEATS_RE.search(lines[j])
            if seats_m:
                seats_left = int(seats_m.group(1))
            j += 1

        fares.append(
            ParsedFare(
                airline=airline,
                flight_no=flight_no,
                dep_time=dep_time,
                origin_code=origin_m.group(2),
                duration=duration,
                stops=stops,
                arr_time=arr_time,
                dest_code=dest_m.group(2),
                price=float(price_m.group(1).replace(",", "")),
                seats_left=seats_left,
            )
        )
        i = j + 1  # skip past "Flight Details"

    return fares
