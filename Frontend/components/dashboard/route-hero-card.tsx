"use client";

import { PlaneTakeoff, FileText, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RouteHeroCard() {
  return (
    <Card className="relative flex h-full min-h-[280px] flex-col justify-end overflow-hidden p-5">
      {/* Decorative route backdrop — gradient + flight path, no stock imagery */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-card to-background" />
        <svg
          className="absolute inset-0 h-full w-full opacity-60"
          viewBox="0 0 300 280"
          preserveAspectRatio="none"
        >
          <path
            d="M -10 220 C 60 180, 90 100, 160 70 S 280 20, 320 -10"
            fill="none"
            stroke="hsl(var(--color-accent))"
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeDasharray="1 10"
            strokeLinecap="round"
          />
        </svg>
        <PlaneTakeoff
          className="absolute right-6 top-6 h-6 w-6 -rotate-45 text-accent/70"
          strokeWidth={1.5}
        />
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
