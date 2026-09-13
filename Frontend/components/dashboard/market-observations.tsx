"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, ArrowLeftRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type WindowsOverviewResponse } from "@/lib/api";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { formatINR, generateDemoSeries } from "@/lib/utils";

type RouteCurve = WindowsOverviewResponse["routes"][number];

const ROUTES = [
  { route_id: 1, route: "DEL-BOM", dgca_weight: 0.23 },
  { route_id: 2, route: "DEL-BLR", dgca_weight: 0.16 },
  { route_id: 3, route: "BOM-BLR", dgca_weight: 0.14 },
];
const WINDOWS = [1, 15, 30];

// Last-minute (T+1) fares run higher than advance-purchase (T+30) ones in
// real fare data - bake in that same shape so the demo spread looks like a
// believable lead-time curve instead of near-flat noise around one base.
const WINDOW_PREMIUM: Record<number, number> = { 1: 900, 15: 0, 30: -500 };

function demoOverview(): WindowsOverviewResponse {
  return {
    windows: WINDOWS,
    routes: ROUTES.map((r, i) => ({
      ...r,
      lead_time_curve: WINDOWS.map((window_days) => ({
        window_days,
        avg_total: generateDemoSeries(
          `${r.route}-${window_days}-mkt`,
          5,
          5500 + i * 900 + WINDOW_PREMIUM[window_days]
        )[4].value,
        sample_size: 12,
      })),
    })),
  };
}

// Cheapest/priciest single reading, and the route whose T+1..T+30 fares swing
// the most - the "corridor extremes" the card name promises. Pure derivation
// from lead_time_curve, no new API surface needed.
function extremes(routes: RouteCurve[]) {
  const readings = routes.flatMap((r) =>
    r.lead_time_curve
      .filter((c) => c.avg_total !== null)
      .map((c) => ({ route: r.route, window_days: c.window_days, avg_total: c.avg_total as number }))
  );
  if (readings.length === 0) return null;
  const cheapest = readings.reduce((a, b) => (b.avg_total < a.avg_total ? b : a));
  const priciest = readings.reduce((a, b) => (b.avg_total > a.avg_total ? b : a));
  const widest = routes
    .map((r) => {
      const vals = r.lead_time_curve.filter((c) => c.avg_total !== null).map((c) => c.avg_total as number);
      return { route: r.route, spread: vals.length ? Math.max(...vals) - Math.min(...vals) : 0 };
    })
    .sort((a, b) => b.spread - a.spread)[0];
  return { cheapest, priciest, widest };
}

export function MarketObservations() {
  const [data, setData] = useState<WindowsOverviewResponse>(demoOverview);
  const [isDemo, setIsDemo] = useState(true);
  const tick = useRealtimeRefresh(["fares", "index_values"]);

  useEffect(() => {
    let cancelled = false;
    api.getWindowsOverview().then((d) => {
      if (cancelled || !d) return;
      setData(d);
      setIsDemo(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const ex = extremes(data.routes);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>Key Market Observations &amp; Corridor Extremes</CardTitle>
          {isDemo && <Badge variant="muted">demo data</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {ex ? (
          <>
            <div className="flex items-start gap-3 rounded-md bg-secondary/40 p-3 shadow-neu-inset-sm">
              <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <p className="text-row text-foreground">
                Cheapest observed fare:{" "}
                <span className="tabular font-semibold">{formatINR(ex.cheapest.avg_total)}</span> on{" "}
                <span className="font-medium">{ex.cheapest.route}</span> at T+{ex.cheapest.window_days}
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-secondary/40 p-3 shadow-neu-inset-sm">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <p className="text-row text-foreground">
                Priciest observed fare:{" "}
                <span className="tabular font-semibold">{formatINR(ex.priciest.avg_total)}</span> on{" "}
                <span className="font-medium">{ex.priciest.route}</span> at T+{ex.priciest.window_days}
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-secondary/40 p-3 shadow-neu-inset-sm">
              <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <p className="text-row text-foreground">
                Widest lead-time spread: <span className="font-medium">{ex.widest.route}</span> (
                <span className="tabular font-semibold">{formatINR(ex.widest.spread)}</span> between T+1 and
                T+30)
              </p>
            </div>
          </>
        ) : (
          <p className="text-row text-muted-foreground">No fare observations recorded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
