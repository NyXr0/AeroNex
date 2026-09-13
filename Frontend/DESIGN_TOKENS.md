# AeroNex Ops Dashboard — Design System

Derived via `ui-ux-pro-max` from the reference layout (dark team-ops dashboard),
re-themed for AeroNex's domain (airfare index / route monitoring / compliance),
then corrected against the reference image's actual accent color (pale mint,
not the catalog's default status-green).

## 1. Design style

**Base match:** Glassmorphism-leaning dark dashboard (catalog: `minimalism-and-swiss-style`
family, dark-tech variant) — dense card grid, soft elevation instead of hard borders,
one accent color used sparingly and consistently for anything "live" or "primary action."
The reference doesn't use heavy blur/frosted panels, so this is a **restrained**
glassmorphism: flat dark cards (`--color-card`), a single accent, no gradients except
the one hero panel.

**Density dial:** 8/10 (dashboard-dense) — an 8–32px spacing scale, not the
16–64px marketing default.

## 2. Color palette

Extracted from the reference (near-black navy base, pale mint-teal accent used on the
timer button, the selected day, and heatmap peaks) and mapped onto AeroNex's existing
"compliance-first, no overclaiming" tone — mint reads as "verified/live," not generic SaaS blue.

| Token | Value | Use |
|---|---|---|
| `--color-background` | `#0B0F1A` | App background |
| `--color-foreground` | `#F5F7FA` | Primary text |
| `--color-card` | `#12172A` | Card surfaces |
| `--color-card-foreground` | `#F5F7FA` | Text on cards |
| `--color-primary` | `#1C2338` | Sidebar / secondary panels |
| `--color-secondary` | `#232B45` | Nested surfaces (calendar cells, list rows) |
| `--color-accent` | `#9FF3DA` | Live/primary actions, active states, chart peaks |
| `--color-on-accent` | `#06251D` | Text/icons on accent fills |
| `--color-muted` | `#1A2036` | Disabled / low-emphasis surfaces |
| `--color-muted-foreground` | `#8B93A7` | Secondary text, captions |
| `--color-border` | `#262C42` | Hairlines, card outlines |
| `--color-destructive` | `#EF4444` | Errors, blocked sources |
| `--color-on-destructive` | `#FFFFFF` | Text on destructive fills |
| `--color-ring` | `#9FF3DA` | Focus ring (meets 3:1 non-text contrast on `--color-background`) |

Accent-on-background contrast: `#9FF3DA` on `#0B0F1A` ≈ 14.8:1 — safe for text; when accent
is a *fill* (e.g. the play button), pair it with `--color-on-accent` (`#06251D`) for the
icon/label, which is what keeps it readable at small sizes.

## 3. Typography

**Pairing:** Premium Sans — **DM Sans** for both headings and body (catalog match:
"Premium Sans (DM Sans)", tag: premium/modern/sophisticated). The reference uses one
consistent grotesk throughout headers, labels, and big numbers rather than mixing families —
DM Sans's tabular-friendly digits make it read cleanly at the large stat-card sizes (94%, 128, ₹112.4).

```
Google Fonts: https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap
```

Big numeric readouts (timer, donut center, stat cards) get `font-variant-numeric: tabular-nums`
so digits don't jitter as they change — necessary for a "live" dashboard, not decorative.

Type scale (dense dashboard, not a marketing scale):

| Role | Size / Weight |
|---|---|
| Stat / hero number | 32px / 700 |
| Card title | 14px / 600 |
| Body / row label | 13px / 500 |
| Caption / muted | 12px / 400 |

## 4. Layout & spacing

- **Container:** full-bleed app shell, `max-w-[1600px]` centered on very large screens, no
  fixed px width below that — matches the reference's edge-to-edge dashboard (not a
  centered marketing container).
- **Grid:** 12-column CSS grid at `xl:`, collapsing to a single column below `lg:` (sidebar
  becomes a top bar / bottom nav on mobile — see component notes).
- **Spacing scale (density 8/10):** `--space-1: 4px` … `--space-8: 32px` (no 48/64/96px steps
  at this density — those belong on marketing pages, not a dashboard).
- **Card radius:** `--radius-lg: 20px` (hero/large cards), `--radius-md: 14px` (standard
  cards), `--radius-sm: 10px` (chips/rows), `--radius-full` (pills, avatars).
- **Card padding:** `20px` standard, `16px` for dense list rows (sources, schedule cells).

## 5. Motion

Standard tier (5/10 — matches a live-data tool that shouldn't feel jumpy):

```js
gsap.from('.grid-item', {
  opacity: 0, scale: 0.92, y: 16, duration: 0.4,
  stagger: { each: 0.06, from: 'start', grid: 'auto' },
  ease: 'back.out(1.4)',
});
```

Respect `prefers-reduced-motion`; the live timer and heatmap ticks still need a
non-animated fallback state that just updates the number/color directly.

## 6. Anti-patterns avoided

- No emoji as icons — Lucide SVGs throughout.
- No labeling anything "live" without a real timestamp/source behind it (the scrape
  session timer and "last scraped" times are the actual mechanism, not decoration).
- Single accent color, not a rainbow of card colors — mint is reserved for
  live/primary/positive; destructive stays red; everything else is neutral.
- Reduced-motion and keyboard-focus states included, not bolted on later (see components).
