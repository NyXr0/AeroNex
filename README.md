# AeroNex

Airfare price-index / DGCA-compliance-monitoring prototype for SIH #26056.
See `../AeroNex_Build_Order.md` for the phase plan this repo follows, and
`../AeroNex_Architecture.md` for the target architecture.

## Run it locally (no Docker needed for dev)

```bash
# Terminal 1 - backend API, seeded with demo data
cd Backend
pip install -r requirements.txt
python seed_demo_data.py
python run_api.py 8000

# Terminal 2 - frontend
cd Frontend
npm install
npm run dev
# open http://localhost:3000 -> redirects to /dashboard
```

The dashboard shows a status banner at the top telling you whether it's
serving live data, demo data, or the backend isn't reachable at all — it's
never supposed to just look broken.

## What's real vs. demo right now

| Piece | Status |
|---|---|
| Backend API (7 endpoints, sqlite) | Real, running, tested |
| MAD outlier detection, price index, backtest correlation | Real code, self-tested |
| DGCA historical ingestion | Real code; ships with a placeholder sample CSV (no internet in the build sandbox to fetch the real one) |
| Fare data on screen | **Seeded demo data** (`Backend/seed_demo_data.py`), not live-scraped yet |
| Live Playwright scraper (`Backend/app/scraping/live/`) | Written, unit-tested against a captured sample, never run end-to-end (no internet in the build sandbox) — **you need to run this once**, see `Backend/README.md` |
| 3 locked routes | Provisional (DGCA-weight-based pick), pending the live-scrape-reliability observation the Build Order actually asks for |
| Frontend (Next.js/Tailwind/shadcn dashboard + methodology page) | Real, wired to the API with graceful fallback; `npm install`/`npm run build`/`npm run lint` all verified clean |

## Production deployment

`docker-compose.yml` + `Caddyfile` + per-service `Dockerfile`s follow
`AeroNex_Architecture.md`'s Deployment section (postgres/api/web/caddy).
`app/db.py` now has a real Postgres path (Supabase-backed): set
`DATABASE_URL` and every existing caller (handlers.py, provenance.py,
live_index.py, dgca_ingest.py) transparently uses it instead of SQLite, no
other code changes. `api` still runs the stdlib backend, not FastAPI —
that part of the architecture doc is still aspirational. See
`DEPLOYMENT.md` for the full deploy guide (frontend/backend/database,
separately or via this compose file). None of this compose setup has been
run through an actual Docker runtime in this environment (none was
available), so test it before relying on it.

## Directory layout

```
AreoNex/
  Backend/    FastAPI-shaped API (currently stdlib), scraping (live + historical),
              MAD/index/backtest processing, sqlite DB
  Frontend/   Next.js dashboard + methodology page
  docker-compose.yml, Caddyfile, */Dockerfile   deployment (untested, see above)
```
