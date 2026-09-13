"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const ROUTE_ID = 1; // DEL-BOM - same route RouteHeroCard highlights
const ROUTE_LABEL = "DEL-BOM";

type Stat = { value: string; label: string };

// Static fallback shown until the API responds, or if it's unreachable.
const FALLBACK: Stat[] = [
  { value: "99.1", label: "National Airfare Index" },
  { value: "3", label: "Routes" },
  { value: "4", label: "Airlines" },
  { value: "N/A", label: `Avg. price (${ROUTE_LABEL})` },
];

export function NationalOverviewCard() {
  const [stats, setStats] = useState(FALLBACK);
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getIndex(), api.getRouteDetail(ROUTE_ID)]).then(([index, detail]) => {
      if (cancelled || !index || index.headline_index === null) return;
      const carriers = detail?.fare_by_carrier ?? [];
      const airlineCount = carriers.length > 0 ? carriers.length : 4;
      const totalSamples = carriers.reduce((s, c) => s + c.sample_size, 0);
      const avgPrice =
        totalSamples > 0
          ? carriers.reduce((s, c) => s + c.avg_total * c.sample_size, 0) / totalSamples
          : null;
      setStats([
        { value: index.headline_index.toFixed(1), label: "National Airfare Index" },
        { value: String(index.per_route.length), label: "Routes" },
        { value: String(airlineCount), label: "Airlines" },
        { value: avgPrice ? formatINR(avgPrice) : "N/A", label: `Avg. price (${ROUTE_LABEL})` },
      ]);
      setIsDemo(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>National Overview</CardTitle>
        {isDemo && <Badge variant="muted">demo data</Badge>}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md bg-secondary/40 p-3 shadow-neu-inset-sm">
            <p className="tabular text-stat text-foreground">{s.value}</p>
            <p className="mt-1 text-caption text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
