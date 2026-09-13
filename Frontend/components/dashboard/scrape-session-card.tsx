"use client";

import { useEffect, useState } from "react";
import { Pause, Play, MoreHorizontal, PlaneTakeoff, Braces } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatElapsed(totalSeconds: number) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(totalSeconds % 60)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const SUBTASKS = [
  { label: "Fetch IndiGo fares", seconds: 12 * 60 + 4, icon: PlaneTakeoff },
  { label: "Parse EaseMyTrip page", seconds: 7 * 60 + 41, icon: Braces },
];

export function ScrapeSessionCard() {
  // Client-only ticking clock; starts from a fixed seed so SSR and first paint match.
  const [elapsed, setElapsed] = useState(42 * 60 + 18);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Live scrape session &middot; DEL&ndash;BOM, T+1</CardTitle>
        <Button variant="icon" size="icon" aria-label="Session options">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between rounded-md bg-secondary p-3">
          <div>
            <p className="text-caption text-muted-foreground">Elapsed this run &middot; window 06:00 IST</p>
            <p className="tabular text-[26px] font-bold leading-tight text-foreground" aria-live="polite">
              {formatElapsed(elapsed)}
            </p>
          </div>
          <Button
            variant="accent"
            size="icon"
            className="h-11 w-11"
            aria-pressed={running}
            aria-label={running ? "Pause scrape session" : "Resume scrape session"}
            onClick={() => setRunning((r) => !r)}
          >
            {running ? (
              <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" />
            )}
          </Button>
        </div>

        <ul className="flex flex-1 flex-col gap-2">
          {SUBTASKS.map(({ label, seconds, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 rounded-md shadow-neu-inset-sm px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                )}
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="flex-1 truncate text-row text-foreground">{label}</span>
              <span className="tabular text-caption text-muted-foreground">
                {formatElapsed(seconds)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
