"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PlaneTakeoff, FileText, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useRealtimeRefresh } from "@/lib/use-realtime-refresh";
import { generateDemoSeries } from "@/lib/utils";

const ROUTE_ID = 1; // DEL-BOM
const WINDOW_DAYS = 15;
const VIEW_W = 300;
const VIEW_H = 280;

function demoSeries() {
  return generateDemoSeries(`${ROUTE_ID}-${WINDOW_DAYS}-hero`, 20, 5800).map((p) => p.value);
}

// Builds the same kind of dashed flight-path curve the old decorative SVG
// drew by hand, but from real (or demo-fallback) price history instead of a
// fixed "M -10 220 C 60 180..." string - real motion, not a screenshot.
function buildPath(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * (VIEW_W + 40) - 20;
  // Flip vertically (lower price = lower on screen reads oddly for a "climb"
  // motif) - higher value draws higher up, matching the original decorative
  // path's up-and-to-the-right climb.
  const y = (v: number) => VIEW_H - 20 - ((v - min) / range) * (VIEW_H - 60);
  return values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
}

export function RouteHeroCard() {
  const [values, setValues] = useState<number[]>(demoSeries);
  const [isDemo, setIsDemo] = useState(true);
  const tick = useRealtimeRefresh(["fares", "index_values"]);

  useEffect(() => {
    let cancelled = false;
    api.getIndexHistory(ROUTE_ID, WINDOW_DAYS).then((d) => {
      if (cancelled || !d || d.series.length < 2) return;
      setValues(d.series.map((p) => p.index_value));
      setIsDemo(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const path = buildPath(values);

  return (
    <Card className="relative flex h-full min-h-[280px] flex-col justify-end overflow-hidden p-5">
      {/* Real (or disclosed demo-fallback) price-history sparkline, drawn in
          on mount and re-drawn on live data changes - replaces the old
          static decorative path. */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-card to-background" />
        <svg
          className="absolute inset-0 h-full w-full opacity-60"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
        >
          <motion.path
            key={path}
            d={path}
            fill="none"
            stroke="hsl(var(--color-accent))"
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeDasharray="1 10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </svg>
        <PlaneTakeoff
          className="absolute right-6 top-6 h-6 w-6 -rotate-45 text-accent/70"
          strokeWidth={1.5}
        />
        {isDemo && (
          <Badge variant="muted" className="absolute left-4 top-4">
            demo data
          </Badge>
        )}
      </div>

      <div className="relative flex items-center justify-between gap-2 rounded-md bg-background/70 p-3 backdrop-blur">
        <div>
          <p className="text-[20px] font-bold leading-none text-foreground">DEL &rarr; BOM</p>
          <p className="mt-1 text-caption text-muted-foreground">3h 05m avg &middot; 4 carriers</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="icon" size="icon" aria-label="View compliance log for this route">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="icon" size="icon" aria-label="View live fares for this route">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
