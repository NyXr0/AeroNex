"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LineChart } from "@/components/dashboard/line-chart";
import { Badge } from "@/components/ui/badge";
import { api, type RoutesResponse } from "@/lib/api";
import { cn, generateDemoSeries } from "@/lib/utils";

const FALLBACK_ROUTES: RoutesResponse = {
  routes: [
    { id: 1, route: "DEL-BOM", dgca_weight: 0.23 },
    { id: 2, route: "DEL-BLR", dgca_weight: 0.16 },
    { id: 3, route: "BOM-BLR", dgca_weight: 0.14 },
  ],
  windows: [1, 15, 30],
};

export default function PriceTrendPage() {
  const [routes, setRoutes] = useState<RoutesResponse>(FALLBACK_ROUTES);
  const [routeId, setRouteId] = useState(1);
  const [windowDays, setWindowDays] = useState(15);
  const [series, setSeries] = useState<{ date: string; index_value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getRoutes().then((d) => {
      if (!cancelled && d && d.routes.length > 0) {
        setRoutes(d);
        setRouteId(d.routes[0].id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getIndexHistory(routeId, windowDays).then((d) => {
      if (cancelled) return;
      // Backend unreachable, or not enough real history yet for this pair -
      // fall back to a disclosed synthetic curve instead of an empty chart
      // (same "never go blank" pattern as api.ts's own getJSON fallback).
      if (d && d.series.length >= 2) {
        setSeries(d.series);
        setIsDemo(false);
      } else {
        setSeries(generateDemoSeries(`${routeId}-${windowDays}`).map((p) => ({ date: p.date, index_value: p.value })));
        setIsDemo(true);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [routeId, windowDays]);

  const first = series[0]?.index_value;
  const last = series[series.length - 1]?.index_value;
  const changePct = first && last ? ((last - first) / first) * 100 : null;
  const currentRoute = routes.routes.find((r) => r.id === routeId);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-4 p-4 lg:p-6">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <h1 className="text-card-title text-foreground">Price Trend</h1>
        <p className="max-w-2xl text-caption text-muted-foreground">
          Daily index history for one route/window pair (2024=100), from the same computed
          index_values rows the headline APIx reads from - GET /api/v1/index/history.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1.5">
            {routes.routes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRouteId(r.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-row cursor-pointer shadow-neu-inset-sm",
                  r.id === routeId ? "bg-accent text-accent-foreground shadow-neu-sm" : "text-muted-foreground hover:bg-card hover:shadow-neu-sm"
                )}
              >
                {r.route}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {routes.windows.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowDays(w)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-row cursor-pointer shadow-neu-inset-sm",
                  w === windowDays ? "bg-accent text-accent-foreground shadow-neu-sm" : "text-muted-foreground hover:bg-card hover:shadow-neu-sm"
                )}
              >
                T+{w}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {currentRoute?.route ?? "Route"} &middot; T+{windowDays}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isDemo && <Badge variant="muted">demo data</Badge>}
                {changePct !== null && (
                  <Badge variant={changePct >= 0 ? "accent" : "outline"}>
                    {changePct >= 0 ? "+" : ""}
                    {changePct.toFixed(1)}% over window
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-8 text-center text-caption text-muted-foreground">Loading&hellip;</p>
              ) : (
                <LineChart series={series.map((p) => ({ date: p.date, value: p.index_value }))} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current reading</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="tabular text-stat text-foreground">{last?.toFixed(1) ?? "—"}</p>
                <p className="text-caption text-muted-foreground">Index value (2024=100)</p>
              </div>
              <div>
                <p className="tabular text-row text-foreground">{series.length} days</p>
                <p className="text-caption text-muted-foreground">history in this series</p>
              </div>
              {currentRoute && (
                <div>
                  <p className="tabular text-row text-foreground">{(currentRoute.dgca_weight * 100).toFixed(1)}%</p>
                  <p className="text-caption text-muted-foreground">DGCA route weight in APIx</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
