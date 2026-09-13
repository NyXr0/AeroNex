"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";

// Static fallback shown until the API responds, or if it's unreachable.
const FALLBACK = [
  { value: "45", label: "Days tracked" },
  { value: "1", label: "Backtests run" },
  { value: "99.1", label: "Current APIx (2024=100)" },
];

export function StatCards() {
  const [stats, setStats] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.getIndex().then((data) => {
      if (cancelled || !data || data.headline_index === null) return;
      setStats([
        { value: "45", label: "Days tracked" },
        { value: String(data.per_route.length), label: "Routes tracked" },
        { value: data.headline_index.toFixed(1), label: `Current APIx (${data.base_year}=100)` },
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <p className="tabular text-stat text-foreground">{s.value}</p>
          <p className="mt-1 text-caption text-muted-foreground">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}
