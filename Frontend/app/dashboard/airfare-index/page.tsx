"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type IndexResponse } from "@/lib/api";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { generateDemoSeries } from "@/lib/utils";

// Same disclosed-fallback rule as the other dashboard pages: backend
// unreachable -> a labeled synthetic reading, never a flat, undisclosed
// "100.0 for every route" that looks like broken live data instead of demo
// data. Reuses generateDemoSeries (already deterministic per seed) instead
// of a second random-number generator.
function demoIndex(): IndexResponse {
  const routes = [
    { route: "DEL-BOM", window_days: 15, dgca_weight: 0.23 },
    { route: "DEL-BLR", window_days: 15, dgca_weight: 0.16 },
    { route: "BOM-BLR", window_days: 15, dgca_weight: 0.14 },
  ];
  const per_route = routes.map((r) => ({
    ...r,
    index_value: generateDemoSeries(`${r.route}-index`, 10).slice(-1)[0].value,
  }));
  const weightedSum = per_route.reduce((s, r) => s + r.dgca_weight * r.index_value, 0);
  const weightTotal = per_route.reduce((s, r) => s + r.dgca_weight, 0);
  return { headline_index: weightedSum / weightTotal, base_year: 2024, per_route };
}

const FALLBACK: IndexResponse = demoIndex();

// Same formula text as Backend/app/api/handlers.py's METHODOLOGY_TEXT -
// static because the formula itself doesn't change per request, matching
// the Methodology page's own fallback pattern.
const FORMULA =
  "Fixed-weight, price-relative index (a Laspeyres-style simplification of a full Fisher index). For route r in window w: relative_r = price_today_r / price_base_r. Index = 100 x sum(weight_r x relative_r) / sum(weight_r), where weight_r is each route's share of DGCA-published monthly passenger traffic.";

export default function AirfareIndexPage() {
  const [data, setData] = useState<IndexResponse>(FALLBACK);
  const [isDemo, setIsDemo] = useState(true);
  const tick = useRealtimeRefresh(["fares", "index_values"]);

  useEffect(() => {
    let cancelled = false;
    api.getIndex().then((d) => {
      if (cancelled) return;
      if (d) {
        setData(d);
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-4 p-4 lg:p-6">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <h1 className="text-card-title text-foreground">Airfare Price Index (APIx)</h1>
        <p className="max-w-2xl text-caption text-muted-foreground">
          The same computed value the National Dashboard headline reads from - GET /api/v1/index -
          broken down by the routes that feed it.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center justify-center gap-1 py-8">
              <p className="tabular text-[48px] font-bold leading-none text-foreground">
                {data.headline_index?.toFixed(1) ?? "—"}
              </p>
              <p className="text-caption text-muted-foreground">APIx &middot; base year {data.base_year} = 100</p>
              {isDemo && <Badge variant="muted">demo data</Badge>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Formula</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-row text-muted-foreground">{FORMULA}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Per-route contribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-row">
                <thead>
                  <tr className="text-caption text-muted-foreground">
                    <th className="p-2 text-left">Route</th>
                    <th className="p-2 text-right">Window</th>
                    <th className="p-2 text-right">Index value</th>
                    <th className="p-2 text-right">DGCA weight</th>
                  </tr>
                </thead>
                <tbody>
                  {data.per_route.map((r) => (
                    <tr key={r.route} className="border-t border-border">
                      <td className="p-2 text-foreground">{r.route}</td>
                      <td className="tabular p-2 text-right text-muted-foreground">T+{r.window_days}</td>
                      <td className="tabular p-2 text-right text-foreground">{r.index_value.toFixed(2)}</td>
                      <td className="tabular p-2 text-right text-muted-foreground">{(r.dgca_weight * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
