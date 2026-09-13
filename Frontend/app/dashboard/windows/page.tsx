"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api, type WindowsOverviewResponse } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Backend unreachable fallback - plausible demo numbers (booking closer to
// departure costs more, same story the real data tells) so the page still
// shows working meters instead of a wall of "no data", disclosed via the
// "demo data" badge below.
const FALLBACK: WindowsOverviewResponse = {
  windows: [1, 15, 30],
  routes: [
    { route_id: 1, route: "DEL-BOM", dgca_weight: 0.23, lead_time_curve: [
      { window_days: 1, avg_total: 8450, sample_size: 12 },
      { window_days: 15, avg_total: 6120, sample_size: 18 },
      { window_days: 30, avg_total: 5380, sample_size: 15 },
    ] },
    { route_id: 2, route: "DEL-BLR", dgca_weight: 0.16, lead_time_curve: [
      { window_days: 1, avg_total: 9200, sample_size: 10 },
      { window_days: 15, avg_total: 6840, sample_size: 16 },
      { window_days: 30, avg_total: 5910, sample_size: 14 },
    ] },
    { route_id: 3, route: "BOM-BLR", dgca_weight: 0.14, lead_time_curve: [
      { window_days: 1, avg_total: 7180, sample_size: 11 },
      { window_days: 15, avg_total: 5340, sample_size: 17 },
      { window_days: 30, avg_total: 4620, sample_size: 13 },
    ] },
  ],
};

export default function WindowsPage() {
  const [data, setData] = useState<WindowsOverviewResponse>(FALLBACK);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getWindowsOverview().then((d) => {
      if (cancelled) return;
      if (d && d.routes.length > 0) {
        setData(d);
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-4 p-4 lg:p-6">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <h1 className="text-card-title text-foreground">Advance-Purchase Windows</h1>
        <p className="max-w-2xl text-caption text-muted-foreground">
          Average fare at T+{data.windows.join(", T+")} days out, per locked route - how much booking
          earlier actually saves, or doesn&apos;t.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {data.routes.map((route) => {
            const known = route.lead_time_curve.filter((c) => c.avg_total !== null);
            const max = Math.max(...known.map((c) => c.avg_total as number), 1);
            return (
              <Card key={route.route_id}>
                <CardHeader>
                  <CardTitle>{route.route}</CardTitle>
                  {isDemo && <Badge variant="muted">demo data</Badge>}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {route.lead_time_curve.map((c) => (
                    <div key={c.window_days}>
                      <div className="mb-1 flex items-baseline justify-between text-row">
                        <span className="text-foreground">T+{c.window_days}</span>
                        <span className="tabular text-muted-foreground">
                          {c.avg_total !== null ? formatINR(c.avg_total) : "no data"}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: c.avg_total !== null ? `${(c.avg_total / max) * 100}%` : "0%" }}
                        />
                      </div>
                      <p className="mt-0.5 text-caption text-muted-foreground">{c.sample_size} fares averaged</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
