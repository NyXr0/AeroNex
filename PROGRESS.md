# PROGRESS.md — Presentation-Readiness Pass (2026-09-13)

30-minute autonomous verification pass over the existing AeroNex prototype
(SIH #26056). Scope: confirm the app already built this session actually
builds, runs, and is committed — not new feature work.

## What got fixed / verified this pass

- **Production build verified for the first time.** `npm run build` (Next.js
  15.5.25) was run for real (not just `next dev`/`tsc --noEmit` as before):
  compiled successfully in ~18s, generated all 11 static routes, exit code 0.
- **Fresh dev server start verified.** Relaunched `Frontend/run-dev.bat`:
  "Ready in 3.9s" on port 3001, no errors.
- **Fresh API server start verified.** Relaunched `Backend/run-api.bat`:
  "AeroNex API on http://localhost:8000/api/v1/..." with no traceback.
- **Backend self-checks re-run clean:** `test_parser`, `provenance`,
  `live_index`, `outliers` all pass their built-in assertions against
  real/synthetic data.
- **All API handlers smoke-tested against the live DB** (`get_routes`,
  `get_windows_overview`, `get_cpi_linkage`, `get_route_detail`) — all
  return valid, JSON-serializable data.
- **Type-checker clean:** `npx tsc --noEmit` — zero errors across all
  pages including the 5 newly added dashboard sub-pages.
- **No leftover debug artifacts:** zero `console.log`/`TODO`/`FIXME`/
  `debugger` statements in code touched this session.
- **CORS confirmed correct:** `Access-Control-Allow-Origin: *` in
  `Backend/app/api/server.py` (fixes the earlier "API not connecting"
  issue regardless of which port the frontend dev server picks).
- **Git repository initialized** (there was none before — the whole
  project was uncommitted). Root `.gitignore` added (node_modules, .next,
  __pycache__, tsbuildinfo, build logs, env files). Initial commit made
  with all 92 tracked files; `git status` is clean.

## Still broken / missing

- **No linter configured** — Next.js scaffold has no `eslint.config.*` and
  no `lint` script in `package.json`. Type-checking (`tsc --noEmit`) is
  clean, but there is no stylistic lint pass. Low priority for a prototype.
- **No JS/TS automated test suite** — only one Python self-check
  (`test_parser.py`) exists project-wide. The dashboard pages have no
  component/unit tests.
- **Interactive click-through of each page was not verified live in a
  browser this session** — the sandbox's browser-automation tier is
  read-only (screenshots only, no navigation/typing) for this device, so
  end-to-end verification relied on: (a) the dev server's own compile log
  showing 200 OK for every route, (b) a direct backend smoke test of every
  API handler against the real database, and (c) confirming both the API
  and frontend processes start cleanly with no stack trace. This is strong
  but not equivalent to a human clicking through each page in a live tab.

## Top 3 next steps

1. Do one manual click-through pass in an actual browser (open each of the
   7 nav pages, confirm charts render with real numbers, no red console
   errors) — the one verification layer this session's tooling couldn't
   reach directly.
2. Add a minimal `eslint.config.mjs` (Next.js's default recommended config)
   and a `lint` script, since none exists yet.
3. Consider a lightweight smoke test for the API server itself (e.g. spin
   it up and hit each endpoint with `urllib`) so "does the server actually
   respond" is covered by an automated check, not just manual `.bat` runs.

## Definition of Done — final status

- [x] Builds/compiles with zero errors (`npm run build` — exit 0)
- [x] Dev server starts and serves the app without crashing (`next dev` —
      Ready in 3.9s)
- [x] API server starts without crashing (`python run_api.py` — listening
      on :8000, no traceback)
- [x] No errors in server logs during startup/compile
- [x] All automated tests pass (`test_parser.py` — the only suite that
      exists)
- [x] Type-checker passes clean (`tsc --noEmit`)
- [~] Linter passes clean — no linter is configured in this project (N/A)
- [x] No leftover TODO/debug console.log statements from this session
- [x] Everything committed; `git status` shows a clean working tree
- [~] Every core flow verified end-to-end via live browser click-through —
      verified indirectly (compile logs + API smoke test), not by manual
      browser interaction (tooling restriction, see "Still broken" above)

## Production-readiness pass #2 (180-min protocol, 2026-09-13 continued)

Checkpoint 1 (~15 min elapsed): Phase 1-3 groundwork.

- Backend: re-ran all 7 self-check scripts (`backtest`, `index_calc`,
  `live_index`, `outliers`, `dgca_ingest`, `provenance`, `test_parser`) —
  all pass. Smoke-tested all 10 API handler functions directly against the
  live sqlite DB (`get_index`, `get_index_history`, `get_route_detail`,
  `get_compliance`, `get_backtest`, `get_methodology`, `get_coverage`,
  `get_routes`, `get_windows_overview`, `get_cpi_linkage`) — all return
  valid JSON-serializable data. Confirmed `server.py`'s error handling:
  unknown routes -> 404, missing route detail -> 404, any handler
  exception -> 500 with a message (never a raw traceback/hang).
- Added `Frontend/.env.example` documenting the one optional env var
  (`NEXT_PUBLIC_API_BASE`) — previously undocumented. No secrets exist
  anywhere in the repo (grepped for API keys/passwords/tokens - none).
- **Added a real ESLint setup** (previously missing entirely): flat
  `eslint.config.mjs` (next/core-web-vitals + next/typescript), `lint`
  script in `package.json`, `eslint`/`eslint-config-next`/`@eslint/eslintrc`
  devDependencies. Installed for real via `npm install` on the actual
  Windows host (the device-bash sandbox has no registry access) and ran
  `next lint`: **zero warnings or errors**.
- **Ran `npm audit`**: 1 high-severity finding — PostCSS (XSS / path
  traversal via `sourceMappingURL`) pulled in transitively through
  `next`'s bundled copy of postcss. Fix requires `npm audit fix --force`,
  which bumps `next` 15 -> 16.3.5, a breaking major-version change.
  **Deliberately not applied**: this is a build-time-only tool
  vulnerability (PostCSS's CSS/source-map *parser*), and AeroNex never
  processes attacker-supplied CSS or exposes source maps to end users at
  runtime — there is no reachable attack path in this app. Forcing a
  breaking Next.js major-version upgrade this close to done, for a
  vulnerability with no actual exploit path here, is worse risk than
  leaving it. Documented rather than silently ignored; a real next step
  if this ships beyond the hackathon is to redo the Next 16 migration on
  its own branch with full re-verification.
