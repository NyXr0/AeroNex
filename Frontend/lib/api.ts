// Fetch wrapper for the AeroNex backend (see AeroNex/Backend/app/api).
// Every function returns null on any failure (server offline, bad JSON, network
// error) instead of throwing - callers keep their own static placeholder data
// as the fallback UI state. This IS the "disclosed graceful fallback" pattern
// (Build Order Phase 2) applied at the frontend layer: a screen never goes
// blank just because the backend isn't running yet.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // backend not running, or unreachable - not an error the UI should crash on
  }
}

export type IndexResponse = {
  headline_index: number | null;
  base_year: number;
  per_route: { route: string; index_value: number; window_days: number; dgca_weight: number }[];
};

export type ComplianceResponse = {
  sources: {
    source: string;
    base_url: string;
    robots_status: string | null;
    last_checked_at: string | null;
    latest_provenance: { source_url: string; http_status: number; robots_check_result: string; scraped_at: string } | null;
  }[];
  // Present once a live run has happened - see Backend/app/scraping/live/sources.py.
  // Phase 2's disclosed graceful-fallback: which sources were tried, in order, and why
  // each one was skipped/failed before the run succeeded (or disclosed "no data").
  latest_fallback_log: {
    origin: string;
    destination: string;
    window_days: number;
    source_used: string | null;
    disclosure: { source: string | null; status: string; action: string; error?: string }[];
  } | null;
};

export type CoverageResponse = {
  locked_routes: string[];
  locked_windows: number[];
  matrix: { route: string; dgca_weight: number; cells: Record<string, boolean> }[];
};

export type BacktestResponse = {
  caveat: string;
  series: { month: string; aeronex_growth_rate: number; dgca_proxy_growth_rate: number; correlation_metric: number; method: string }[];
};

export type MethodologyResponse = Record<string, string>;

export type RoutesResponse = {
  routes: { id: number; route: string; dgca_weight: number }[];
  windows: number[];
};

export type IndexHistoryResponse = {
  route_id: number;
  window_days: number;
  series: { date: string; index_value: number }[];
};

export type FareComposition = {
  base: number;
  tax: number;
  fees: number;
  total: number;
  currency: string;
  sample_size: number;
  is_demo_estimate: boolean;
};

export type RouteDetailResponse = {
  route: string;
  dgca_weight: number;
  lead_time_curve: { window_days: number; avg_total: number | null; sample_size: number }[];
  fare_composition: FareComposition | null;
  fare_by_carrier: { carrier: string; avg_total: number; sample_size: number }[];
};

export type WindowsOverviewResponse = {
  windows: number[];
  routes: {
    route_id: number;
    route: string;
    dgca_weight: number;
    lead_time_curve: { window_days: number; avg_total: number | null; sample_size: number }[];
  }[];
};

export type CpiLinkageResponse = {
  mospi_reference: { series_name: string; value: number; as_of: string; base_year: number; note: string };
  aeronex_history: { date: string; headline_index: number }[];
};

export const api = {
  getIndex: () => getJSON<IndexResponse>("/api/v1/index"),
  getIndexHistory: (routeId: number, windowDays: number) =>
    getJSON<IndexHistoryResponse>(`/api/v1/index/history?route_id=${routeId}&window_days=${windowDays}`),
  getCompliance: () => getJSON<ComplianceResponse>("/api/v1/compliance"),
  getCoverage: () => getJSON<CoverageResponse>("/api/v1/coverage"),
  getBacktest: () => getJSON<BacktestResponse>("/api/v1/backtest"),
  getMethodology: () => getJSON<MethodologyResponse>("/api/v1/methodology"),
  getRouteDetail: (routeId: number) => getJSON<RouteDetailResponse>(`/api/v1/routes/${routeId}`),
  getRoutes: () => getJSON<RoutesResponse>("/api/v1/routes"),
  getWindowsOverview: () => getJSON<WindowsOverviewResponse>("/api/v1/windows"),
  getCpiLinkage: () => getJSON<CpiLinkageResponse>("/api/v1/cpi-linkage"),
};

// ponytail: this originally checked "does a DEMO_SEED source row exist" -
// but that row is seeded once and never removed, so once seed_demo_data.py
// had ever run, this returned true forever, even after real scrapes
// (run_live_scrape.py) started backing the headline index for real. Fixed:
// "live" means at least one non-demo source has an actual real scrape on
// record (latest_provenance set), not "no demo data was ever seeded."
export function isDemoData(compliance: ComplianceResponse | null): boolean {
  if (!compliance) return true;
  const hasRealScrape = compliance.sources.some(
    (s) => s.source !== "DEMO_SEED" && s.latest_provenance !== null
  );
  return !hasRealScrape;
}
