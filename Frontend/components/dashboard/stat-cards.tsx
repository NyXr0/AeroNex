"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { api } from "@/lib/api";

type Stat = { value: number; label: string; format?: (n: number) => string };

// Static fallback shown until the API responds, or if it's unreachable.
const FALLBACK: Stat[] = [
  { value: 45, label: "Days tracked" },
  { value: 1, label: "Backtests run" },
  { value: 99.1, label: "Current APIx (2024=100)", format: (n) => n.toFixed(1) },
];

export function StatCards() {
  const [stats, setStats] = useState<Stat[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.getIndex().then((data) => {
      if (cancelled || !data || data.headline_index === null) return;
      setStats([
        { value: 45, label: "Days tracked" },
        { value: data.per_route.length, label: "Routes tracked" },
        {
          value: data.headline_index,
          label: `Current APIx (${data.base_year}=100)`,
          format: (n) => n.toFixed(1),
        },
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
      {stats.map((s, i) => (
        <Card key={s.label} className="p-4" motionDelay={i * 0.05}>
          <p className="tabular text-stat text-foreground">
            <AnimatedNumber value={s.value} format={s.format} />
          </p>
          <p className="mt-1 text-caption text-muted-foreground">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}
