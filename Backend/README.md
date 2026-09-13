# AeroNex Backend — Phase 0.2 spike

One route, one window, real Playwright scrape -> provenance log, end-to-end
(per `AeroNex_Build_Order.md`, Phase 0).

## Run it

```bash
pip install -r requirements.txt
playwright install chromium
python run_spike.py DEL BOM 1      # DEL->BOM, T+1
```

Writes to `data/aeronex_spike.db` (sqlite) and one raw HTML snapshot per run
under `data/snapshots/`.

**Run this from a normal terminal with real internet** — not a sandboxed dev
shell. Both this build's cloud workspace and its Windows device shell had
their outbound network locked down (org egress policy), so the scraper was
verified structurally (parser tested against a real captured page-text
sample, `easemytrip.py` compiles clean) but never executed live end-to-end.
That's a real gap, not a formality — run it once and see what actually
breaks first.

## Known unverified spots (ponytail-flagged in the code)

- `_set_route()` — only DEL/BOM's cached defaults were confirmed live; a
  different route likely needs clicking an autocomplete suggestion after
  typing, not just `.fill()`.
- `_set_departure_date()` — `.fill()` is the lazy first attempt; if the date
  field rejects typed input, it needs calendar-popup clicks instead (raises
  a clear `RuntimeError` telling you which function to fix).
- `_dismiss_popups()` — the "EVA" chat modal appeared once during manual
  testing; the close-button selectors are best-effort guesses.

## Why sqlite, not the Postgres from the architecture doc

A one-route spike doesn't need a database server — stdlib `sqlite3` does
the job. The schema (`app/db.py`) is already shaped like
`AeroNex_Architecture.md`'s Postgres tables, so Phase 1 (3 routes x 3
windows) is a DSN swap, not a redesign.

## Files

```
app/
  db.py                      sqlite schema + connection (stdlib only)
  scraping/
    robots_check.py          robots.txt compliance check
    provenance.py            fare + provenance_log writer (+ self-check)
    live/
      easemytrip.py          the actual Playwright scraper
      parser.py              text -> structured fare rows
      test_parser.py         self-check against a real captured sample
run_spike.py                 CLI entry point
```

## What's new since the Phase 0.2 spike (full autonomous build pass)

Everything below runs TODAY with seeded demo data, no live scrape needed:

```bash
python seed_demo_data.py     # writes 810 demo fares + index_values + backtest_results
python run_api.py 8000       # serves http://localhost:8000/api/v1/...
```

- `app/db.py` — added `index_values` + `backtest_results` tables (architecture's Database section).
  Also: `PRAGMA journal_mode=MEMORY` — the project folder is a network/FUSE-bridged mount
  (Windows <-> Cowork device bridge) which broke sqlite's default rollback-journal locking
  ("disk I/O error" on every commit). This fix applies regardless of where you eventually
  run the real scraper from.
- `app/scraping/historical/dgca_ingest.py` — the "historical/public-data" half of the
  two-part scraping architecture. Parses a DGCA monthly city-pair CSV into
  `routes.dgca_weight`. Ships with `sample_dgca_traffic.csv` (clearly labeled placeholder
  figures) since neither build sandbox had internet to download the real DGCA/Vonter-mirror
  CSV — swap that file for a real one, nothing else changes.
- `app/processing/outliers.py` — MAD-based outlier flagging (Build Order #8).
- `app/processing/index_calc.py` — fixed-weight price-relative index. Named honestly as a
  Laspeyres-style simplification, not a true Fisher index (that needs quantity data nobody
  publishes for airfares — see the code comment).
- `app/processing/backtest.py` — MoM growth-rate correlation (Build Order #9), using
  `statistics.correlation` (stdlib, Python 3.10+).
- `seed_demo_data.py` — seeds the 3 provisionally-locked routes (DEL-BOM, DEL-BLR, BOM-BLR
  — see below) x 3 windows (T+1/T+15/T+30) x 45 days, tagged `source_name="DEMO_SEED"` so
  nothing pretends to be a real scrape.
- `app/api/` — a stdlib `http.server` JSON API matching all 7 endpoints in
  `AeroNex_Architecture.md`'s API table (`/api/v1/index`, `/index/history`, `/routes/{id}`,
  `/compliance`, `/backtest`, `/methodology`, `/coverage`). FastAPI/uvicorn could not be
  pip-installed in either build sandbox (no PyPI access) — every handler in
  `app/api/handlers.py` is a plain function returning a dict, so wrapping each in
  `@router.get(...)` later is the entire FastAPI migration, not a rewrite.

## About the "3 locked routes"

Build Order Phase 1 says to lock the 3 routes from **live scraper-reliability results**,
not by picking importance. That observation hasn't happened yet (Task 2, above, is still
blocked on you running the real scraper once). DEL-BOM / DEL-BLR / BOM-BLR is a
**provisional** stand-in — the 3 heaviest routes by DGCA traffic share among the
PS-named pairs (see `AeroNex_Research_Phase_Report.md`) — used only so the rest of the
pipeline (API, frontend, index, backtest) has real routes to run against today. Once you
run `run_spike.py` against a few sources and see what's actually reliable, update
`ROUTES` in `seed_demo_data.py` and re-run it if the real answer differs.

## Disclosed graceful fallback (Build Order Phase 2, #6/#7)

`app/scraping/live/sources.py` tries sources in priority order and never
raises on total failure — it returns a disclosed "no data this run" result
instead, which is the actual point of Phase 2 (no blank holes in the demo).
Only EaseMyTrip is a real scraper today; `IndiGo (direct)` and
`Air India (direct)` are listed but marked not-yet-implemented, so the
fallback chain is honest about what exists. `run_spike.py` now goes through
this and writes `data/last_disclosure.json`, which `GET /api/v1/compliance`
picks up and the dashboard's Sources card displays. Self-tested with fake
sources (`python -m app.scraping.live.sources`) since there's no real
failure to provoke without live network.

## Live run #1 result and fix (2026-09-14)

You ran `python run_spike.py DEL BOM 1` — exactly as asked. It correctly
disclosed the fallback chain (IndiGo/Air India direct: not implemented,
skipped; EaseMyTrip: attempted) and then failed on the departure-date field,
exactly where the code's own `# ponytail` comment said the risk was.

Root cause (confirmed via a live browser walkthrough of the real site):
`#ddate` looked like it might be a jQuery UI datepicker (there's a leftover
`#ui-datepicker-div` in the page), but it isn't — EaseMyTrip built their own
two-month calendar. Each day is a `<li id="{prefix}_{n}_DD/MM/YYYY"
onclick="SelectDate(this.id)">`, so `.fill()` on the text field was never
going to work; the fix clicks the day cell whose `id` ends in the target
`DD/MM/YYYY`, paging the calendar forward with the "next month" arrow
(`#img2Nex`) if the target date isn't in the initial 2-month view.

`_set_departure_date()` in `app/scraping/live/easemytrip.py` is fixed and
verified against the real live site. **Please run it again** —
`_set_route()` (typing a different origin/destination than the cached
DEL/BOM) is the next-most-likely thing to break, per its own ponytail flag,
and hasn't been exercised live yet either.

## Live run #2 result and fix attempt (2026-09-14, unverified)

Second run got past the fallback disclosure fine, then timed out (30s) on
`page.click("#ddate")` itself — before even reaching the calendar logic
fixed above. I could not reproduce this from here: manual browser testing
uses a persistent, cookie-carrying profile with `navigator.webdriver: false`,
while your real run is a brand-new, cookie-less, headless Chromium context
every time — exactly the kind of session a first-visit popup (EVA chat, a
consent banner) is more likely to show for, and headless Chromium can also
render slightly differently on some sites.

Since I can't see what's actually on screen when it hangs, this round is a
**layered, unverified** fix rather than a confirmed one:

- `_click_robust()` — tries a normal click, falls back to a direct JS click
  if Playwright's overlay/stability check keeps timing out. Applied to the
  `#ddate` and "next month" clicks.
- `_dismiss_popups()` — more selector patterns, plus an Escape keypress,
  and it's now called a second time right before the date click (a chat
  widget can appear async, after the first pass already found nothing).
- `browser.launch()` — added `--disable-blink-features=AutomationControlled`
  and a real Chrome user-agent string. Standard Playwright headless/headed
  parity flags, not bot-detection evasion (robots.txt + rate-limiting stay
  the real compliance gate).

**If this run also fails**, the single most useful thing you can do is tell
me exactly what error/timeout it prints — or, if you're comfortable running
one more command, `PWDEBUG=1 python run_spike.py DEL BOM 1` opens
Playwright's own inspector so you can literally watch/screenshot what's on
screen the moment it hangs. That would settle this in one shot instead of
more guessing.

## Live run #3 result and fix (2026-09-14) - real cause found via PWDEBUG

`PWDEBUG=1` (the Playwright Inspector) showed exactly what was wrong,
first-try, no more guessing needed: the calendar WAS opening correctly
(the geolocation-prompt and popup-dismissal fixes from run #2 worked). The
new failure was `page.wait_for_selector(".box .days li[onclick^=
'SelectDate']")` timing out after 5s despite resolving to 32 elements -
because Playwright's default `wait_for_selector` waits for the FIRST DOM
match to become *visible*, and the first matching `<li>` in each month grid
is `id="fst_0_00/00/0000"`, a deliberately `visibility:hidden` padding cell
for the blank days before the 1st of the month. It was waiting on a cell
that is never supposed to become visible, while the 31 real, clickable day
cells sat right next to it.

Fixed with `state="attached"` - this step only ever needed to confirm the
calendar's day grid exists in the DOM, not that some arbitrary first match
is visible; the actual target-date cell lookup right after it already
handles its own visibility correctly. Not yet re-verified live (couldn't
reproduce the original hang here to test the fix against) - please run
again.

## Live run #4 result and fix (2026-09-14) - "Scraped 0 fares"

Real progress: the calendar, search, and page-load all worked this time
(robots: allowed, HTTP 200) - it just parsed 0 fares out of a real results
page. Root-caused by redoing the same live search in a browser and reading
the actual results text: a "nearby airport" result (e.g. arriving at Navi
Mumbai/NMI instead of the searched Mumbai/BOM, or departing from
Ghaziabad/HDO instead of Delhi/DEL) inserts an extra `(NN km from CITY)`
line right after the airport name. `parser.py`'s original 2026-09-13
captured sample happened to have zero nearby-airport rows, so this never
got caught - but on a real page, the *first* result is very often one of
these, and the parser's strict 9-fields-then-"Book Now" check bailed out on
row 1 before ever reaching a well-formed row further down. That's the whole
"0 fares" - not a broken page, a broken assumption about row shape.

Fixed in `parser.py` by stripping `(NN km from ...)` lines alongside blank
lines before the positional field extraction - and added a regression test
in `test_parser.py` using the real captured multi-airport-format sample, so
this specific shape can't silently break again. Not yet re-verified against
an actual live run.

## Live run #5 result (2026-09-14) - confirmed working end-to-end

`python run_spike.py DEL BOM 1` scraped 21 real fares (robots: allowed,
HTTP 200) and wrote 21 fare + provenance rows to `aeronex_spike.db`. The
parser fix above was the last blocker - Phase 0.2 (one route/window, real
scrape -> provenance log) is genuinely done.

## `_set_route()` rewritten ahead of a live failure (2026-09-14)

`_set_route()` (origin/destination other than the DEL/BOM defaults) had
never actually run - the spike only ever exercised DEL->BOM, and the old
implementation (`.fill()` into a placeholder-matched input) was flagged
unverified from day one. Rather than wait for it to break on the next
route, investigated the real site directly: the visible "From"/"To" boxes
open a "Top Cities" suggestion list on click, and each row is
`<li onclick="autoSelectMul('spnN','<field_id>','<CODE>-...',...)">` - the
onclick itself names which field it fills, so the new `_pick_city()` pins
both the target field id and the code in the selector
(`li[onclick*="'FromSector_show'"][onclick*="'DEL-"]` etc.) instead of
matching on visible text, which has already caused two separate bugs in
this scraper (a hidden calendar cell, a hidden "nearby airport" parser
line).

DEL, BOM, BLR (our 3 locked-route candidates) all sit in the default
unfiltered list alongside CCU/GOI/HYD/MAA and a few international cities,
so no typing/autocomplete-filtering step was needed. Verified the DOM
structure and the click flow manually in a real browser; NOT yet run
through `run_spike.py` end-to-end for a non-DEL/BOM route - that's the
next thing to confirm (`python run_spike.py DEL BLR 1` or similar).

## Live run #6 results (2026-09-14) - route-switching confirmed, one new parser bug found and fixed

Ran 4 more live tests after the `_set_route()` rewrite:

- `DEL BLR 1` -> **0 fares** (bug, see below)
- `BOM BLR 1` -> 4 fares, worked
- `DEL BOM 15` -> 37 fares, worked
- `DEL BOM 30` -> 71 fares, worked

3 of 4 worked, which already confirms `_set_route()` itself is fine (BOM->BLR
switched both origin AND destination successfully) and that T+15/T+30 need
no special handling beyond what T+1 already does.

DEL->BLR's 0 fares was a new parser bug, not a route-switching bug -
reproduced live and read the actual results text: some rows (Air India /
Air India Express here) render a leading perk badge line - "Enjoy Free
Meals" - immediately before the airline name. The old parser assumed a
row's 9 fields always start right where the previous row's "Flight
Details" delimiter left off; a badge line shifts that start by one,
misaligning every field check. On the real run, the very first (cheapest)
result happened to be one of these badged rows, so row 1 itself
mismatched and the whole parse returned 0.

Fixed by anchoring on "Book Now" instead of a fixed offset - it's the one
delimiter every row has that badges never sit in front of, so the 9 fields
immediately before it are reliably the row regardless of what badge/promo
text came earlier. Also changed a row that still doesn't match to be
skipped (not to abort every row after it), since we now know this page has
more badge variety than one sample can capture. Added a regression test
(`MEAL_BADGE_SAMPLE`) built from the real captured DEL->BLR text - passes,
along with the existing DEL->BOM and nearby-airport samples. Not yet
re-verified against an actual `DEL BLR 1` live run.

## Routes locked for real (2026-09-14)

All 9 combinations (3 routes x 3 windows) came back with clear output on a
live run: DEL-BOM, DEL-BLR, and BOM-BLR each scrape successfully at T+1,
T+15, and T+30. Per the Build Order's instruction to lock routes based on
actual scraper reliability rather than DGCA traffic weight alone, this
confirms the same 3 routes the weight-based provisional pick already had -
so no route swap was needed, but the lock is now backed by live evidence,
not just importance.

Added `app/config.py` as the single source of truth for `LOCKED_ROUTES` /
`FARE_WINDOWS` - `seed_demo_data.py` and `app/api/handlers.py` each had
their own hardcoded copy of this list (found while wiring this in), which
is exactly the kind of drift a shared constant prevents. Both now import
from `app/config.py`.

Added `run_live_scrape.py` - Phase 1.4's "parameterize one scrape job
across 3 routes x 3 windows," done by looping `run_spike.py`'s already-
proven scrape -> record_fare path over the full matrix instead of one
route/window at a time. One combination failing doesn't stop the other 8.
Not yet run as a single batch end-to-end (each combination was verified
individually via `run_spike.py`) - run `python run_live_scrape.py` to do
the full 9-combination sweep in one go and replace the demo-seeded data
with real scraped fares.

## Real scraped fares now actually move the index (2026-09-14)

Running `run_live_scrape.py` wrote real fares to the `fares` table across
all 9 route x window combinations, but that alone didn't change anything
the dashboard shows: `get_index()` reads `index_values`, which was ONLY
ever populated by `seed_demo_data.py`. Real scrapes were landing in the DB
and just sitting there, invisible.

First attempt at fixing this anchored each real observation to the SAME
base price the demo series uses (day 0 of the synthetic 45-day history).
Ran it against the real DB and got index values of 218-443 across every
single route/window - a 2-4x "increase" in one day, everywhere, isn't a
real signal, it's the synthetic `BASE_FARE` placeholders (~5000-6200,
guessed for demo purposes) sitting far below what EaseMyTrip actually
charges for these dates today. Reverted those 9 rows immediately rather
than let a misleading number sit in the dashboard's numbers.

Fixed properly in `app/processing/live_index.py`: real data gets its own
base, anchored to the first real observation per route/window (index =
100.0 the day live scraping starts for that route/window, tracked relative
to it from then on) - never compared against a synthetic number. The base
prices persist in `data/real_index_base.json` (same small-sidecar-file
pattern as `data/last_disclosure.json`). `run_live_scrape.py` now calls
this automatically after its scrape loop. Verified against the real DB:
`get_index()` now returns a real `headline_index` of 100.0 (correctly -
today is the first real data point for all 3 routes) instead of the demo
seed's last value.

Also fixed `isDemoData()` in the frontend (`lib/api.ts`): it checked
whether a `DEMO_SEED` source row exists at all, which is seeded once and
never removed - so it would have kept calling every screen "demo data"
forever, even now that real scrapes back the index. Fixed to check for an
actual real scrape on record (`latest_provenance` set on a non-DEMO_SEED
source) instead.

## MAD outlier detection wired into real fares too (2026-09-14)

`app/processing/outliers.py` existed and was self-tested since Phase 3.8,
but was only ever called from `seed_demo_data.py` - real fares written by
`record_fare()` sat with `is_outlier = 0` (the DB default) forever, so a
single stray premium/long-layover fare among today's real results could
silently skew both `get_route_detail()`'s averages and the new real index
average above. `app/processing/live_index.py` now MAD-flags today's real
fares per route/window before averaging them (needs >= 2 fares to mean
anything), and the index average excludes flagged outliers, consistent
with how `get_route_detail()` already treats them.

Wiring this in after the index base was already set caused exactly the
inconsistency you'd expect: re-running `compute_and_store()` against the
real DB changed which fares counted as "today's average" for 2 of the 9
route/windows (an outlier that hadn't been excluded before now was),
producing a base vs. current-average mismatch and index values like 114.3
and 56.31 on what should still have been day 1 (index = 100 everywhere).
Caught it, deleted the stale `index_values` rows and the `real_index_base.json`
sidecar, and reran once clean - all 9 route/windows correctly show 100.0
again, now anchored to the finished (outlier-aware) methodology instead of
an earlier partial one. Confirmed via `get_index()`/`get_route_detail()`
against the real DB.


## Three new endpoints + a real fare-structure split (2026-09-13)

Added the backend pieces the frontend's new Price Trend, Airfare Index, CPI
Analysis, T-Windows, and Fare Breakdown pages needed, all reusing existing
tables rather than new pipelines:

- `GET /api/v1/routes` - the 3 locked routes (id/label/weight), for frontend
  route selectors. Small, but nothing else exposed route ids before this.
- `GET /api/v1/windows` - T+1/T+15/T+30 avg fare for all 3 routes at once
  (the same per-route lead-time-curve query `get_route_detail()` already
  ran, extracted into `_lead_time_curve()` so it's not duplicated).
- `GET /api/v1/cpi-linkage` - AeroNex's own weighted headline-index history
  next to the one real, published MoSPI figure (105.01, "Passenger transport
  services", June 2026 - see `Brain/AeroNex_Buildlist_Technical_Addendum.md`).
  Deliberately NOT a computed correlation like `/api/v1/backtest` - MoSPI
  publishes one monthly figure, and pretending to correlate that against a
  few weeks of AeroNex data would be the exact false-precision overclaim
  this project is positioned against. It's a captioned reference-point
  comparison, and says so on-screen.

`get_route_detail()` also gained `fare_composition` (avg base/tax/fees/total)
- the 1.5 "fare structure breakdown" requirement. Turned out `record_fare()`
never accepted base_fare/tax/fees at all (only `total`), and real EaseMyTrip
scrapes still can't populate them - `parser.py` only gets a bundled price off
the results list; a real split needs a per-fare detail-page scrape that
doesn't exist yet. Rather than fabricate a "real" breakdown, extended
`record_fare()` to accept the three fields (optional, for whenever real
per-fare scraping exists), and had `seed_demo_data.py` synthesize a
documented 80/15/5 base/tax/fees split off its own already-synthetic total
(`split_fare()`) - base+tax+fees sums back to exactly total by construction.
Backfilled the 810 existing DEMO_SEED fare rows in the real DB directly
(one-off UPDATE by fingerprint's source, not a re-run of the seeding script -
that would have duplicated `index_values`/`backtest_results`). Real
EaseMyTrip rows are untouched and stay NULL. `fare_composition` carries
`is_demo_estimate: true` whenever no real (non-DEMO_SEED) fare contributed,
so the frontend captions it as an estimate instead of presenting synthetic
data as a real fare-structure finding.
