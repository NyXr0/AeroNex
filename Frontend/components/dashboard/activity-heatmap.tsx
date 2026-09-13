"use client";

import { Fragment } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = ["2pm", "12am", "10am", "8am", "6am", "4am", "2am", "12pm"];

const LEGEND = [
  { label: "0", className: "bg-secondary" },
  { label: ">20/hr", className: "bg-accent/25" },
  { label: ">50/hr", className: "bg-accent/60" },
  { label: ">100/hr", className: "bg-accent" },
] as const;

// 8 rows x 7 cols of request-volume tiers (0-3), seeded to read as plausible
// scrape traffic rather than random noise: busiest around the 3x/day windows.
const GRID: number[][] = [
  [1, 0, 0, 1, 0, 1, 0],
  [0, 1, 1, 0, 1, 0, 1],
  [2, 2, 1, 2, 2, 1, 0],
  [1, 3, 2, 3, 1, 2, 1],
  [0, 1, 0, 1, 0, 1, 0],
  [1, 2, 3, 2, 2, 3, 1],
  [2, 1, 1, 1, 2, 1, 1],
  [0, 0, 1, 0, 0, 0, 0],
];

export function ActivityHeatmap() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>Scrape activity</CardTitle>
          <Badge variant="muted">-120 req &middot; +79% avg</Badge>
        </div>
        <div className="flex items-center gap-3">
          <ul className="hidden items-center gap-3 sm:flex">
            {LEGEND.map((l) => (
              <li key={l.label} className="flex items-center gap-1 text-caption text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-sm", l.className)} aria-hidden="true" />
                {l.label}
              </li>
            ))}
          </ul>
          <Button variant="icon" size="icon" aria-label="Change date range">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-1.5">
          <div />
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-caption text-muted-foreground">
              {d}
            </div>
          ))}

          {GRID.map((row, rowIndex) => (
            <Fragment key={rowIndex}>
              <div className="text-caption text-muted-foreground">
                {HOUR_LABELS[rowIndex]}
              </div>
              {row.map((tier, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn("aspect-square rounded-sm", LEGEND[tier].className)}
                  role="img"
                  aria-label={`${DAY_LABELS[colIndex]} ${HOUR_LABELS[rowIndex]}: ${LEGEND[tier].label} requests`}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
