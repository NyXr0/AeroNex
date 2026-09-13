"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LineChart } from "@/components/dashboard/line-chart";
import { api, type CpiLinkageResponse } from "@/lib/api";
import { generateDemoSeries } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const FALLBACK: CpiLinkageResponse = {
  mospi_reference: {
    series_name: "Passenger transport services",
    value: 105.01,
    as_of: "2026-06",
    base_year: 2024,
    note:
      "MoSPI does not publish an air-transport-only CPI sub-index; this is the broader passenger-transport-services class (air/rail/bus/taxi/auto), of which air travel is one component.",
  },
  aeronex_history: [],
};

export default function CpiAnalysisPage() {
  const [data, setData] = useState<CpiLinkageResponse>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getCpiLinkage().then((d) => {
      if (cancelled) return;
      // Same disclosed-fallback pattern as Price Trend: backend unreachable
      // or too little real history -> a labeled synthetic curve, never a
      // blank chart.
      if (d && d.aeronex_history.length >= 2) {
        setData(d);
        setIsDemo(false);
      } else {
        setData({
          mospi_reference: FALLBACK.mospi_reference,
          aeronex_history: generateDemoSeries("cpi-linkage").map((p) => ({ date: p.date, headline_index: p.value })),
        });
        setIsDemo(true);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = data.aeronex_history[data.aeronex_history.length - 1]?.headline_index ?? null;
  const { mospi_reference } = data;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-4 p-4 lg:p-6">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <h1 className="text-card-title text-foreground">CPI Analysis</h1>
        <p className="max-w-2xl text-caption text-muted-foreground">
          AeroNex&apos;s own headline index next to the one real, published MoSPI reference figure -
          a reference-point comparison, not a computed correlation (see the caveat below).
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-1 py-6">
              <p className="tabular text-stat text-foreground">{current?.toFixed(1) ?? "—"}</p>
              <p className="text-caption text-muted-foreground">AeroNex APIx (2024=100)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-1 py-6">
              <p className="tabular text-stat text-foreground">{mospi_reference.value.toFixed(2)}</p>
              <p className="text-caption text-muted-foreground">
                MoSPI &ldquo;{mospi_reference.series_name}&rdquo; ({mospi_reference.as_of})
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-1 py-6">
              <p className="tabular text-stat text-foreground">{data.aeronex_history.length}</p>
              <p className="text-caption text-muted-foreground">days of AeroNex history plotted</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>APIx vs. MoSPI reference</CardTitle>
              {isDemo && <Badge variant="muted">demo data</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-caption text-muted-foreground">Loading&hellip;</p>
            ) : (
              <LineChart
                series={data.aeronex_history.map((p) => ({ date: p.date, value: p.headline_index }))}
                referenceValue={mospi_reference.value}
                referenceLabel={`MoSPI ${mospi_reference.value}`}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle>Read this honestly</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-row text-foreground">{mospi_reference.note}</p>
            <p className="mt-2 text-row text-muted-foreground">
              This chart lines AeroNex&apos;s daily index up against MoSPI&apos;s one published monthly
              figure - it is not a statistical correlation. The Back-test page is where AeroNex
              actually computes a growth-rate correlation, against a DGCA-derived proxy with enough
              monthly history for that to mean something.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
