"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, FlaskConical } from "lucide-react";
import { api, isDemoData } from "@/lib/api";

type Status = "checking" | "live" | "demo" | "offline";

export function DataStatusBanner() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const [index, compliance] = await Promise.all([api.getIndex(), api.getCompliance()]);
      if (cancelled) return;
      if (index === null) return setStatus("offline");
      setStatus(isDemoData(compliance) ? "demo" : "live");
    }
    check();
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (status === "checking") return null;

  const config = {
    live: {
      icon: Wifi,
      text: "Live data — serving real scraped fares from the AeroNex API.",
      className: "bg-accent/10 text-accent",
    },
    demo: {
      icon: FlaskConical,
      text: "Demo data — seeded sample fares (see seed_demo_data.py). The live Playwright scraper hasn't run on this machine yet.",
      className: "bg-secondary/60 text-muted-foreground",
    },
    offline: {
      icon: WifiOff,
      text: "Backend API not reachable — showing static placeholder data. Start it with: python run_api.py (from AeroNex/Backend).",
      className: "bg-destructive/10 text-destructive",
    },
  }[status];

  const Icon = config.icon;
  return (
    <div className={`mx-4 mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-caption lg:mx-6 shadow-neu-inset-sm ${config.className}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{config.text}</span>
    </div>
  );
}
