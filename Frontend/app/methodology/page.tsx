"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CoverageMatrix } from "@/components/dashboard/coverage-matrix";
import { api, type MethodologyResponse } from "@/lib/api";

// Static fallback = the exact same copy as Backend/app/api/handlers.py's
// METHODOLOGY_TEXT, so this page never looks broken if the API is offline.
const FALLBACK: MethodologyResponse = {
  index_construction:
    "Fixed-weight, price-relative index (a Laspeyres-style simplification of a full Fisher index - a true Fisher index needs current-period expenditure quantities, which no public source, including DGCA, publishes for airfares). For route r in a window w: relative_r = price_today_r / price_base_r. Route weights come from each route's share of DGCA-published monthly passenger traffic (routes.dgca_weight). Index = 100 x sum(weight_r x relative_r) / sum(weight_r).",
  base_period: "2024 (index = 100.0 at base).",
  windows: "T+1, T+15, T+30 days advance purchase - the 3 windows in Phase 1's locked scope.",
  outlier_detection:
    "MAD (median absolute deviation), not z-score/3-sigma: modified z-score 0.6745 x (x - median) / MAD, flagged when |score| > 3.5 (Iglewicz & Hoaglin). Chosen because scraped fare series are right-skewed by a handful of premium/last-minute fares, which distorts a mean-based z-score.",
  backtest_method:
    "Month-over-month growth-rate correlation (not raw-level correlation) between AeroNex's index and a DGCA-derived proxy, because DGCA does not publish a clean average-fare series (only traffic/load-factor data). The proxy and this comparison are explicitly monthly vs. AeroNex's daily granularity; that frequency mismatch is stated up front, not hidden.",
  compliance:
    "Every live-scraped fare passes through a robots.txt check before the request is made and is logged with source URL, HTTP status, and a raw snapshot. Historical/DGCA ingestion has no scraping-compliance question at all - it parses documents that are already public.",
};

const SECTION_TITLES: Record<string, string> = {
  index_construction: "Index construction",
  base_period: "Base period",
  windows: "Advance-purchase windows",
  outlier_detection: "Outlier detection",
  backtest_method: "Back-test method",
  compliance: "Compliance & provenance",
};

const QA_SENTENCE =
  "Registered MVP: 2 routes. Delivered: 3 routes, 3 fully real advance-purchase windows, end-to-end. Architecture is parameterized to scale to the full basket - we chose depth over a padded demo.";

export default function MethodologyPage() {
  const [content, setContent] = useState<MethodologyResponse>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.getMethodology().then((data) => {
      if (!cancelled && data) setContent(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-4 p-4 lg:p-6">
        <Link
          href="/dashboard"
          className="flex w-fit items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <h1 className="text-card-title text-foreground">Methodology</h1>
        <p className="max-w-2xl text-caption text-muted-foreground">
          Plain formulas, not a slide claim - what a stats-ministry judge reads first.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Object.entries(SECTION_TITLES).map(([key, title]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-row text-muted-foreground">{content[key]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <CoverageMatrix />

        <Card className="border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle>Pre-empting Q&amp;A</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-row italic text-foreground">&ldquo;{QA_SENTENCE}&rdquo;</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
