import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

// Deterministic seeded PRNG (mulberry32) - not cryptographic, just needs to
// reproduce the same-looking curve for the same seed across reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Synthetic day-by-day series for chart fallbacks when the backend API is
 * unreachable or hasn't produced enough real history yet - the same
 * "disclosed graceful fallback" pattern as api.ts's getJSON (see its header
 * comment), extended to cover chart-shaped data instead of a single value.
 * Deterministic per `seed` (e.g. `${routeId}-${windowDays}`) so a given
 * route/window always draws the same demo curve instead of reshuffling on
 * every reload. Callers are responsible for disclosing this is demo data
 * (see the "demo data" badge on Price Trend / CPI Analysis).
 */
export function generateDemoSeries(seed: string, days = 45, base = 100): { date: string; value: number }[] {
  const rand = mulberry32(hashSeed(seed));
  const out: { date: string; value: number }[] = [];
  let value = base;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // mild mean-reverting random walk: drifts day to day but stays near `base`
    value += (rand() - 0.5) * 3 + (base - value) * 0.05;
    out.push({ date: d.toISOString().slice(0, 10), value: Math.round(value * 100) / 100 });
  }
  return out;
}

/**
 * Small live-looking oscillation around `base`, driven by a tick counter -
 * makes a demo chart's most-recent point visibly "breathe" every couple of
 * seconds instead of sitting frozen, without fabricating drift in the
 * historical points behind it. Deterministic per (seed, tick) so it's still
 * reproducible, just animated across re-renders as `tick` increments.
 */
export function liveJitter(seed: string, tick: number, amplitude = 1.5): number {
  const rand = mulberry32(hashSeed(`${seed}:${tick}`))();
  return Math.sin(tick * 0.6) * amplitude * 0.7 + (rand - 0.5) * amplitude;
}

