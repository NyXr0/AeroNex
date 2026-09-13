"use client";

import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const SOURCES = [
  { initials: "IN", label: "IndiGo" },
  { initials: "EM", label: "EaseMyTrip" },
  { initials: "CT", label: "Cleartrip" },
  { initials: "MT", label: "MakeMyTrip" },
  { initials: "DG", label: "DGCA (historical)" },
];

export function RouteHeader() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-5 sm:flex-row sm:items-center sm:justify-between lg:px-6">
      <div>
        <h1 className="text-[20px] font-semibold leading-tight text-foreground">
          AeroNex &middot; Route Monitoring
        </h1>
        <p className="text-row text-muted-foreground">3 routes &middot; 5 sources tracked</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex -space-x-2" aria-label={`${SOURCES.length} sources`}>
          {SOURCES.map((s) => (
            <Avatar key={s.label} initials={s.initials} ring title={s.label} aria-label={s.label} />
          ))}
        </div>
        <Button variant="accent" size="sm">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add source
        </Button>
      </div>
    </div>
  );
}
