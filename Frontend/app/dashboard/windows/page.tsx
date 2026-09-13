"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api, type WindowsOverviewResponse } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const FALLBACK: WindowsOverviewResponse = {
  windows: [1, 15, 30],
  routes: [
    { route_id: 1, route: "DEL-BOM", dgca_weight: 0.23, lead_time_curve: [
      { window_days: 1, avg_total: null, sample_size: 0 },
      { window_days: 15, avg_total: null, sample_size: 0 },
      { window_days: 30, avg_total: null, sample_size: 0 },
    ] },
  ],
};

export default function WindowsPage() {
  const [data, setData] = useState<WindowsOverviewResponse>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.getWindowsOverview().then((d) => {
      if (!cancelled && d) setData(d);
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
