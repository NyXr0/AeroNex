"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type RoutesResponse, type FareComposition } from "@/lib/api";
import { cn, formatINR } from "@/lib/utils";

const FALLBACK_ROUTES: RoutesResponse = {
  routes: [
    { id: 1, route: "DEL-BOM", dgca_weight: 0.23 },
    { id: 2, route: "DEL-BLR", dgca_weight: 0.16 },
    { id: 3, route: "BOM-BLR", dgca_weight: 0.14 },
  ],
  windows: [1, 15, 30],
};

const SEGMENTS: { key: keyof Pick<FareComposition, "base" | "tax" | "fees">; label: string; colorClass: string }[] = [
  { key: "base", label: "Base fare", colorClass: "bg-accent" },
  { key: "tax", label: "Tax", colorClass: "bg-foreground/60" },
  { key: "fees", label: "Fees", colorClass: "bg-muted-foreground" },
];

export default function FareBreakdownPage() {
  const [routes, setRoutes] = useState<RoutesResponse>(FALLBACK_ROUTES);
  const [routeId, setRouteId] = useState(1);
  const [composition, setComposition] = useState<FareComposition | null>(null);
  const [loading, setLoading] = useState(true);

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
    api.getRouteDetail(routeId).then((d) => {
      if (cancelled) return;
      setComposition(d?.fare_composition ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  const currentRoute = routes.routes.find((r) => r.id === routeId);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-4 p-4 lg:p-6">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <h1 className="text-card-title text-foreground">Fare Breakdown</h1>
        <p className="max-w-2xl text-caption text-muted-foreground">
          Base fare, tax, and fees, decomposed rather than shown as one bundled total (PS #26056&apos;s
          explicit ask - both rival prototypes skip this).
        </p>

        <div className="flex gap-1.5">
          {routes.routes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRouteId(r.id)}
              className={cn(
                "rounded-full border border-border px-3 py-1.5 text-row cursor-pointer",
                r.id === routeId ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {r.route}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{currentRoute?.route ?? "Route"}</CardTitle>
              {composition?.is_demo_estimate && <Badge variant="muted">demo estimate</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-caption text-muted-foreground">Loading&hellip;</p>
            ) : !composition ? (
              <p className="py-8 text-center text-caption text-muted-foreground">
                No fare breakdown available for this route yet.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex h-8 w-full overflow-hidden rounded-md" role="img" aria-label={`Base ${formatINR(composition.base)}, tax ${formatINR(composition.tax)}, fees ${formatINR(composition.fees)}`}>
                  {SEGMENTS.map((seg) => (
                    <div
                      key={seg.key}
                      className={seg.colorClass}
                      style={{ width: `${(composition[seg.key] / composition.total) * 100}%` }}
                    />
                  ))}
                </div>

                <ul className="flex flex-wrap gap-x-6 gap-y-2">
                  {SEGMENTS.map((seg) => (
                    <li key={seg.key} className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", seg.colorClass)} aria-hidden="true" />
                      <span className="text-row text-muted-foreground">{seg.label}</span>
                      <span className="tabular text-row text-foreground">{formatINR(composition[seg.key])}</span>
                    </li>
                  ))}
                </ul>

                <p className="tabular text-row text-foreground">
                  {SEGMENTS.map((s) => formatINR(composition[s.key])).join(" + ")} = {formatINR(composition.total)}
                </p>

                <p className="text-caption text-muted-foreground">
                  Averaged across {composition.sample_size} non-outlier fares.
                  {composition.is_demo_estimate &&
                    " Real EaseMyTrip scrapes only expose a bundled total today (no per-fare detail-page scrape yet) - this split is a documented estimate applied to demo-seeded data, not a claim about real fare structure."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
