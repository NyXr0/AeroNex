# AeroNex Ops Dashboard — reference-image rebuild

A premium dark dashboard screen for AeroNex (Next.js + React + Tailwind + shadcn-style
primitives), built from a reference HR/team-ops dashboard image and re-themed onto
AeroNex's own domain — routes, live scraping, and the DGCA/historical backtest — using
the `ui-ux-pro-max` skill for style/color/typography/spacing analysis.

This is delivered as a **standalone file set** (per your answer) rather than dropped into
`Project V2`, since that project has architecture docs but no scaffolded Next.js app yet.
Copy the folders below into a Next.js (App Router) + Tailwind project once it exists, or
use this as the first commit of that app.

## What maps to what (reference → AeroNex)

| Reference (HR dashboard) | This build (AeroNex ops) |
|---|---|
| Employee profile photo card | `RouteHeroCard` — route (DEL→BOM), avg time, carrier count |
| Time tracking (timer + subtasks) | `ScrapeSessionCard` — live scrape-job timer + per-source subtasks |
| Working format donut (Office/Hybrid/Remote) | `CoverageDonut` — Live-scraped / Historical (DGCA) / Disclosed-fallback |
| Days in company / Done projects / Salary | `StatCards` — Days tracked / Backtests run / Current APIx index |
| "HRadar Premium" upsell | `StorageUpsellCard` — local-volume → S3/MinIO upgrade note (from the architecture doc) |
| Tasks overview (weekly calendar) | `ScheduleCalendar` — 3x/day scrape schedule per route×window |
| Work activity heatmap | `ActivityHeatmap` — scrape request volume by hour/day |
| Apps & URLs list | `SourcesList` — IndiGo/EaseMyTrip/Cleartrip/MakeMyTrip/DGCA, last-scraped + fare share |

Numbers used (3 routes, 5 sources, 4 carriers, T+1/T+15/T+30 windows, the DGCA-proxy
backtest, the S3/MinIO storage note) are pulled directly from `AeroNex_Architecture.md`
so the screen reads as *this project's* dashboard, not a generic template.

## File tree

```
app/
  globals.css          design tokens (CSS variables) + font import
  dashboard/page.tsx    the screen — composes every component below
components/
  ui/                   button, card, badge, avatar (shadcn-style primitives)
  dashboard/            sidebar, top-bar, route-header, route-hero-card,
                        scrape-session-card, coverage-donut, stat-cards,
                        storage-upsell-card, schedule-calendar,
                        activity-heatmap, sources-list
lib/utils.ts            cn() class-merge helper
tailwind.config.ts       token → Tailwind theme mapping
DESIGN_TOKENS.md         full design-system writeup (style, color, type, spacing, motion)
```

## Setup

```bash
npm install next react react-dom clsx tailwind-merge class-variance-authority lucide-react
npm install -D typescript tailwindcss @types/react @types/react-dom @types/node
```

Then wire `tailwind.config.ts` and `app/globals.css` into your Next.js app the normal way
(App Router: import `globals.css` in `app/layout.tsx`), and visit `/dashboard`.

**Note:** this sandbox's network policy blocked `npm install` from `registry.npmjs.org`
during the build (403 on every package, including plain `react`), so the components
were verified by static analysis instead — brace/paren/JSX balance-checked file by file,
and every `import { X } from "@/…"` cross-checked against an actual `export` in the
target file. Both passed clean, but you should still run `npm run typecheck` the first
time you drop this into a real project, since a live `tsc` pass is stronger evidence than
either of those checks alone.

## Design-system notes

See `DESIGN_TOKENS.md` for the full breakdown. Short version: dark-only by design (an
ops tool, not a marketing site), one mint accent (`#9FF3DA`) reserved for live/primary
state, DM Sans throughout, 8/10 dashboard-density spacing, 14–20px card radii.

## Accessibility / UX checklist applied

- All icon-only buttons have `aria-label`; decorative icons/avatars are `aria-hidden`.
- Focus-visible rings (`focus-visible:ring-2 ring-ring`) on every interactive element,
  not just the default browser outline.
- Heatmap cells carry `role="img"` + a text `aria-label` (day, hour, tier) — color alone
  never carries the information.
- The live timer uses `aria-live="polite"` so it's announced without spamming; `prefers-reduced-motion`
  is handled globally in `globals.css`.
- Mobile: sidebar collapses (hidden below `lg:`), the grid drops to a single column,
  and the schedule/heatmap scroll horizontally inside their own `overflow-x-auto`
  container rather than the whole page scrolling sideways.
- No emoji-as-icons; every icon is a Lucide SVG with `aria-hidden` when decorative.

## Known follow-ups (not done here, flagged rather than silently skipped)

- `ActivityHeatmap`'s grid is seeded placeholder data (`GRID` array), not wired to a
  real metrics endpoint — swap that constant for a fetch once `/api/v1/coverage`-style
  data exists.
- Icon names (Lucide) were chosen from memory and are almost certainly current, but
  weren't checked against a live `lucide-react` install because of the network block
  above — a `tsc`/build pass will immediately flag any renamed icon if one slipped.

## Brand logo (2026-09-13)

Wired the real AeroNex logo (blue/cyan "A"-into-airplane mark) in from the supplied
source artwork, replacing the placeholder mint-circle + Lucide `PlaneTakeoff` glyph
that stood in for it during the initial dashboard build:

- Matted the source JPEG (near-white `#f7f7f7` background) to a transparent PNG via a
  distance-from-background alpha ramp, then cropped the mark (the "A" + plane swoosh)
  away from the "AERONEX / FLY BEYOND LIMITS" wordmark below it, since the sidebar is
  a 64px icon-only rail with no room for a wordmark.
- `app/icon.png` (256x256) and `app/apple-icon.png` (180x180) use Next.js's built-in
  metadata-file convention (App Router auto-generates the `<link rel="icon">` /
  apple-touch-icon tags from these filenames — no manual `metadata.icons` wiring needed).
- `public/logo-mark.png` (128x128, transparent) replaces the sidebar's placeholder mark,
  rendered at 36px so it stays crisp at the rail's actual display size.
- The full wordmark lockup wasn't wired in anywhere: nothing in the current layout has
  space for it (no landing/login screen, just the dashboard shell), so it wasn't added
  as a dead, unreferenced asset. Add it if a marketing/login page shows up later.

## Five new pages wired to real endpoints (2026-09-13)

Sidebar nav used to have 5 items (Routes/Compliance/Backtest/Sources/Schedule) that
all silently pointed back at `/dashboard` - not real pages. Replaced them with 6 items
that go somewhere real: National Dashboard (the existing Overview page, relabeled),
Price Trend (`/dashboard/price-trend`, GET /api/v1/index/history), Airfare Index
(`/dashboard/airfare-index`, GET /api/v1/index), CPI Analysis
(`/dashboard/cpi-analysis`, GET /api/v1/cpi-linkage), T Windows (`/dashboard/windows`,
GET /api/v1/windows), and Fare Breakdown (`/dashboard/fare-breakdown`, GET
/api/v1/routes/{id}'s new `fare_composition` field). Methodology stays as-is.

Added one shared `<LineChart>` (`components/dashboard/line-chart.tsx`, hand-rolled SVG,
same no-charting-library reasoning as `coverage-matrix.tsx`) used by both Price Trend
and CPI Analysis instead of duplicating the scaling/path math per page.

Not done here: the Back-test screen (`GET /api/v1/backtest` already exists
backend-side) still has no dedicated nav entry or page - it wasn't part of this
batch's 6 requested pages, so it stays a documented gap rather than getting built
unasked.
