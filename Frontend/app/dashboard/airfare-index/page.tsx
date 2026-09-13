"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api, type IndexResponse } from "@/lib/api";

const FALLBACK: IndexResponse = {
  headline_index: 100.0,
  base_year: 2024,
  per_route: [
    { route: "DEL-BOM", index_value: 100.0, window_days: 15, dgca_weight: 0.23 },
    { route: "DEL-BLR", index_value: 100.0, window_days: 15, dgca_weight: 0.16 },
    { route: "BOM-BLR", index_value: 100.0, window_days: 15, dgca_weight: 0.14 },
  ],
};

// Same formula text as Backend/app/api/handlers.py's METHODOLOGY_TEXT -
// static because the formula itself doesn't change per request, matching
// the Methodology page's own fallback pattern.
const FORMULA =
  "Fixed-weight, price-relative index (a Laspeyres-style simplification of a full Fisher index). For route r in window w: relative_r = price_today_r / price_base_r. Index = 100 x sum(weight_r x relative_r) / sum(weight_r), where weight_r is each route's share of DGCA-published monthly passenger traffic.";

export default function AirfareIndexPage() {
  const [data, setData] = useState<IndexResponse>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.getIndex().then((d) => {
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
