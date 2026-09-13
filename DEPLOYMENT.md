# Deploying AeroNex

Three pieces, deployed separately: **frontend** (Next.js), **backend**
(stdlib Python API), **database** (Postgres via Supabase, or SQLite for
anything smaller than production).

## 1. Database (Supabase)

A Supabase Postgres project already backs this app (see `Backend/app/db.py`).
To point any environment at it:

1. In the Supabase dashboard -> Project Settings -> Database, copy the
   connection string (or reset the password if you don't have it).
2. Set `DATABASE_URL=postgresql://...` wherever the backend runs.

Leave `DATABASE_URL` unset and the backend falls back to a local SQLite file
(`Backend/data/aeronex_spike.db`) - zero setup, fine for local dev or a demo,
but not shared/persistent across deploys.

Realtime dashboard updates (no polling) use the same project's public anon
key - see `Frontend/.env.example`.

## 2. Backend (any Python host)

The API is a single stdlib process - no framework lock-in, so it runs on
whatever's cheapest: Render, Railway, Fly.io, a VPS, or the bundled Docker
image.

```bash
cd Backend
pip install -r requirements.txt
python run_api.py        # reads PORT env var if set, else defaults to 8000
```

Required for a host-managed deploy:
- **Start command**: `python run_api.py`
- **Health check path**: `/healthz` (returns `{"status": "ok"}`, no DB
  round-trip - safe for liveness/readiness probes even if the DB is briefly
  unreachable)
- **Env vars**: `DATABASE_URL` (see above), `PORT` (most hosts inject this
  automatically)

Docker: `docker build -t aeronex-api ./Backend` (see `Backend/Dockerfile`).

## 3. Frontend (Vercel or any Node host)

```bash
cd Frontend
npm install
npm run build
npm run start
```

Env vars (`Frontend/.env.example`):
- `NEXT_PUBLIC_API_BASE` - the deployed backend's URL
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - optional,
  enables live realtime updates; the dashboard works without them (falls
  back to on-load fetch + its existing demo-data fallback, never a blank
  screen)

Vercel: import the repo, set the root directory to `Frontend/`, add the env
vars above.

## 4. All-in-one self-host (docker-compose)

`docker-compose.yml` runs all three services (plus Caddy as a reverse
proxy) on one machine:

```bash
DATABASE_URL=postgresql://...        \
NEXT_PUBLIC_SUPABASE_URL=https://... \
NEXT_PUBLIC_SUPABASE_ANON_KEY=...    \
docker compose up --build
```

Omit the three env vars above and it still runs - `api` uses SQLite, `web`
runs without realtime. There's also a bundled `postgres` service for
self-hosting Postgres yourself instead of Supabase (set `POSTGRES_PASSWORD`
and point `DATABASE_URL` at it instead).

Not yet verified: this compose file hasn't been run through an actual
Docker runtime in this environment (none was available) - the config is
correct against each Dockerfile/service by inspection, but do a test run
before relying on it for a real deploy.

## Locked scope reminder

The backend only ever serves 3 routes (DEL-BOM, DEL-BLR, BOM-BLR) x 3 lead
windows (T+1/T+15/T+30) - that's a deliberate project scope limit, not a
missing feature, and nothing above changes it.
