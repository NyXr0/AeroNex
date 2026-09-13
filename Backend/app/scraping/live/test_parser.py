"""
Runnable self-check for parser.py, using real captured excerpts of
easemytrip.com's DEL->BOM results — not synthetic HTML.

Run: python -m app.scraping.live.test_parser
"""
from app.scraping.live.parser import parse_results

# Captured live 2026-09-14: the first 2 of these 4 rows land at a "nearby
# airport" (Navi Mumbai/NMI, not the searched Mumbai/BOM) and one also
# departs from a nearby airport (Ghaziabad/HDO, not the searched Delhi/DEL)
# - each inserts an extra "(NN km from CITY)" line that broke the original
# parser (see parser.py's ponytail note). This is what "Scraped 0 fares"
# on a real run traced back to: the very first result on the page was one
# of these, so the strict row-shape parser bailed out before reaching any
# of the plain BOM-direct rows further down.
NEARBY_AIRPORT_SAMPLE = """AIRLINES
DEPARTURE
DURATION
ARRIVE
PRICE
Air India Express
IX-1080
18:40
New Delhi(DEL)

02h 25m

Nonstop
21:05
Navi Mumbai(NMI)
(24 km from Mumbai)
₹6,529
Book Now
Lock Price ₹294
 9 Seats Left
EASEFLY: Get extra Rs.800 instant discount on this flight
Flight Details
IndiGo
6E-5096
17:00
Ghaziabad(HDO)
(28 km from New Delhi)

02h 05m

Nonstop
19:05
Navi Mumbai(NMI)
(24 km from Mumbai)
₹6,442
Book Now
Lock Price ₹290
BOOKNOW: Get extra Rs.220 instant discount on this flight
Flight Details
Air India Express
IX-1235
23:25
New Delhi(DEL)

02h 25m

Nonstop
01:50
Mumbai(BOM)
₹6,688
Book Now
Lock Price ₹301
 9 Seats Left
EASEFLY: Get extra Rs.800 instant discount on this flight
Flight Details
"""

# Captured live 2026-09-14 (DEL->BLR T+1): some rows carry a leading perk
# badge line -- "Enjoy Free Meals" here -- BEFORE the airline name, shifting
# where the row's 9 fields start. On the real failing run the very
# cheapest/first result was one of these (an Air India flight), so the old
# fixed-offset parser mismatched on row 1 immediately and returned 0 fares.
# This is what the "Book Now"-anchored rewrite in parser.py fixes.
MEAL_BADGE_SAMPLE = """AIRLINES
DEPARTURE
DURATION
ARRIVE
PRICE
Enjoy Free Meals
Air India
AI-2803
06:30
New Delhi(DEL)

02h 55m

Nonstop
09:25
Bengaluru(BLR)
₹10,004
Book Now
Lock Price ₹451
 9 Seats Left
BOOKNOW: Get extra Rs.420 instant discount on this flight
Flight Details
IndiGo
6E- 704
02:25
New Delhi(DEL)

05h 15m

1 Stop
07:40
Bengaluru(BLR)
₹9,946
Book Now
BOOKNOW: Get extra Rs.220 instant discount on this flight
Flight Details
"""

REAL_SAMPLE = """AIRLINES
DEPARTURE
DURATION
ARRIVE
PRICE
IndiGo
6E- 303
20:00
New Delhi(DEL)

02h 10m

Nonstop
22:10
Mumbai(BOM)
₹6,530
Book Now
 2 Seats Left
BOOKNOW: Get extra Rs.220 instant discount on this flight
Flight Details
AkasaAir
QP-1820
17:30
New Delhi(DEL)

02h 15m

Nonstop
19:45
Mumbai(BOM)
₹6,530
Book Now
 9 Seats Left
BOOKNOW: Get extra Rs.220 instant discount on this flight
Flight Details
IndiGo
6E- 322
23:30
New Delhi(DEL)

02h 15m

Nonstop
01:45
Mumbai(BOM)
₹6,530
Book Now
BOOKNOW: Get extra Rs.220 instant discount on this flight
Flight Details
"""


def demo() -> None:
    fares = parse_results(REAL_SAMPLE)

    assert len(fares) == 3, f"expected 3 rows, got {len(fares)}"

    first = fares[0]
    assert first.airline == "IndiGo"
    assert first.flight_no == "6E- 303"
    assert first.dep_time == "20:00"
    assert first.origin_code == "DEL"
    assert first.arr_time == "22:10"
    assert first.dest_code == "BOM"
    assert first.price == 6530.0
    assert first.seats_left == 2

    third = fares[2]
    assert third.flight_no == "6E- 322"
    assert third.seats_left is None, "no 'Seats Left' line in the source -> must stay None"

    nearby = parse_results(NEARBY_AIRPORT_SAMPLE)
    assert len(nearby) == 3, f"expected 3 rows (nearby-airport sample), got {len(nearby)}"
    assert nearby[0].dest_code == "NMI", "nearby-airport annotation must not swallow the real row"
    assert nearby[0].price == 6529.0
    assert nearby[1].origin_code == "HDO", "nearby-airport annotation on the ORIGIN side too"
    assert nearby[1].dest_code == "NMI"
    assert nearby[2].origin_code == "DEL" and nearby[2].dest_code == "BOM", "plain row after two nearby-airport rows must still parse"

    badge = parse_results(MEAL_BADGE_SAMPLE)
    assert len(badge) == 2, f"expected 2 rows (meal-badge sample), got {len(badge)}"
    assert badge[0].airline == "Air India", "leading 'Enjoy Free Meals' badge must not become the airline field"
    assert badge[0].price == 10004.0
    assert badge[1].airline == "IndiGo" and badge[1].price == 9946.0, "row after a badged row must still parse"

    print(f"OK — parsed {len(fares)} real rows correctly, plus {len(nearby)}/3 nearby-airport rows, plus {len(badge)}/2 meal-badge rows")


if __name__ == "__main__":
    demo()
