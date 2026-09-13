"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, formatINR, generateDemoSeries } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROUTE_ID = 1; // DEL-BOM - same route RouteHeroCard highlights
const ROUTE_LABEL = "DEL-BOM";
const WINDOW_DAYS = 15;

const TIERS = [
  { label: "Low", className: "bg-accent/25 text-foreground" },
  { label: "Typical", className: "bg-secondary text-foreground" },
  { label: "Elevated", className: "bg-accent/60 text-accent-foreground" },
  { label: "Peak", className: "bg-accent text-accent-foreground" },
] as const;

function tierFor(value: number, min: number, max: number): number {
  if (max === min) return 1;
  const pct = (value - min) / (max - min);
  return pct < 0.25 ? 0 : pct < 0.5 ? 1 : pct < 0.75 ? 2 : 3;
}

function demoDays() {
  return generateDemoSeries(`${ROUTE_ID}-${WINDOW_DAYS}-calendar`, 35, 5800).map((d) => ({
    date: d.date,
    price: d.value,
  }));
}

export function FlightPriceCalendar() {
  const [days, setDays] = useState(demoDays);
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getIndexHistory(ROUTE_ID, WINDOW_DAYS), api.getRouteDetail(ROUTE_ID)]).then(
      ([history, detail]) => {
        if (cancelled || !history || !detail || history.series.length < 7) return;
        const baseline = detail.lead_time_curve.find((c) => c.window_days === WINDOW_DAYS)?.avg_total;
        const latest = history.series[history.series.length - 1].index_value;
        if (!baseline || !latest) return;
        // Index history tracks the APIx, not a rupee price - scale the
        // route's own observed average by how today's index compares to
        // each day's, so the calendar shows an indicative price, not a
        // fabricated one disconnected from real fares.
        setDays(
          history.series
            .slice(-35)
            .map((s) => ({ date: s.date, price: baseline * (s.index_value / latest) }))
        );
        setIsDemo(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const prices = days.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  // Pad the front of the grid so the first real cell lands on its actual
  // day-of-week column instead of always starting under "Sun".
  const firstDow = days.length ? new Date(days[0].date).getDay() : 0;
  const cells: ({ date: string; price: number } | null)[] = [...Array(firstDow).fill(null), ...days];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>Flight price calendar</CardTitle>
          <Badge variant="muted">
            {ROUTE_LABEL} &middot; T+{WINDOW_DAYS}
          </Badge>
          {isDemo && <Badge variant="muted">demo data</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <ul className="hidden items-center gap-3 sm:flex">
            {TIERS.map((t) => (
              <li key={t.label} className="flex items-center gap-1 text-caption text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-sm", t.className)} aria-hidden="true" />
                {t.label}
              </li>
            ))}
          </ul>
          <Button variant="icon" size="icon" aria-label="Change date range">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-caption text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((cell, i) =>
            cell ? (
              <div
                key={cell.date}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-sm text-[11px]",
                  TIERS[tierFor(cell.price, min, max)].className
                )}
                title={formatINR(cell.price)}
              >
                <span className="tabular font-semibold">{new Date(cell.date).getDate()}</span>
                <span className="tabular opacity-80">{formatINR(cell.price)}</span>
              </div>
            ) : (
              <div key={`pad-${i}`} aria-hidden="true" />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
