"use client";

import { Search, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const DAYS = [
  { short: "Sun", date: 15 },
  { short: "Mon", date: 16 },
  { short: "Tue", date: 17 },
  { short: "Wed", date: 18, today: true },
  { short: "Thu", date: 19 },
  { short: "Fri", date: 20 },
  { short: "Sat", date: 21 },
];

const TIME_SLOTS = ["06:00", "10:00", "14:00", "18:00", "22:00"];
const ROW_HEIGHT = 56; // px per slot, used for absolute event placement

type ScrapeEvent = {
  dayIndex: number; // 0 = Sun
  slotIndex: number; // index into TIME_SLOTS
  title: string;
  subtitle: string;
  tone: "accent" | "solid" | "muted";
  sources: string[];
};

const EVENTS: ScrapeEvent[] = [
  {
    dayIndex: 3,
    slotIndex: 0,
    title: "T+1 fetch",
    subtitle: "DEL–BOM window",
    tone: "accent",
    sources: ["IN", "EM"],
  },
  {
    dayIndex: 4,
    slotIndex: 2,
    title: "Backtest sync",
    subtitle: "DGCA proxy merge",
    tone: "solid",
    sources: ["DG"],
  },
  {
    dayIndex: 6,
    slotIndex: 3,
    title: "T+15 fetch",
    subtitle: "BOM–BLR window",
    tone: "muted",
    sources: ["CT", "MT"],
  },
];

const TONE_CLASSES: Record<ScrapeEvent["tone"], string> = {
  accent: "bg-accent text-accent-foreground",
  solid: "bg-card text-foreground shadow-neu-inset-sm",
  muted: "bg-secondary/50 text-muted-foreground",
};

export function ScheduleCalendar() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Scrape schedule</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="icon" size="icon" aria-label="Search schedule">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="icon" size="icon" aria-label="Refresh schedule">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[56px_repeat(7,1fr)]">
          <div />
          {DAYS.map((d) => (
            <div key={d.short} className="flex flex-col items-center pb-2">
              <span className="text-caption text-muted-foreground">{d.short}</span>
              <span
                className={cn(
                  "mt-1 flex h-7 w-7 items-center justify-center rounded-full text-row font-semibold",
                  d.today ? "bg-accent text-accent-foreground" : "text-foreground"
                )}
              >
                {d.date}
              </span>
            </div>
          ))}

          <div className="flex flex-col text-caption text-muted-foreground" style={{ marginTop: 4 }}>
            {TIME_SLOTS.map((t) => (
              <div key={t} style={{ height: ROW_HEIGHT }} className="flex items-start">
                {t}
              </div>
            ))}
          </div>

          {DAYS.map((day, dayIndex) => (
            <div
              key={day.short}
              className="relative border-l border-border/60"
              style={{ height: ROW_HEIGHT * TIME_SLOTS.length, marginTop: 4 }}
            >
              {TIME_SLOTS.map((_, slotIndex) => (
                <div
                  key={slotIndex}
                  className="border-b border-border/40"
                  style={{ height: ROW_HEIGHT }}
                  aria-hidden="true"
                />
              ))}

              {EVENTS.filter((e) => e.dayIndex === dayIndex).map((e) => (
                <div
                  key={e.title}
                  className={cn(
                    "absolute inset-x-1 rounded-md p-2 shadow-sm",
                    TONE_CLASSES[e.tone]
                  )}
                  style={{ top: e.slotIndex * ROW_HEIGHT + 4, minHeight: ROW_HEIGHT - 8 }}
                >
                  <p className="text-caption font-semibold leading-tight">{e.title}</p>
                  <p className="truncate text-[11px] leading-tight opacity-80">{e.subtitle}</p>
                  <div className="mt-1 flex -space-x-1.5">
                    {e.sources.map((s) => (
                      <Avatar key={s} initials={s} size="sm" ring />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
