"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api, type CoverageResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

// Plotly was named in the architecture doc for this matrix, purely because
// Recharts has no native heatmap - a 3-15 row x 5 column grid doesn't need a
// charting library at all (ponytail: native CSS grid covers it, one less
// dependency that also can't be npm-installed in this sandbox anyway).
const WINDOWS = [1, 7, 15, 30, 45];

const FALLBACK: CoverageResponse = {
  locked_routes: ["DEL-BOM", "DEL-BLR", "BOM-BLR"],
  locked_windows: [1, 15, 30],
  matrix: [
    { route: "DEL-BOM", dgca_weight: 0.23, cells: { "1": true, "7": false, "15": true, "30": true, "45": false } },
    { route: "DEL-BLR", dgca_weight: 0.16, cells: { "1": true, "7": false, "15": true, "30": true, "45": false } },
    { route: "BOM-BLR", dgca_weight: 0.14, cells: { "1": true, "7": false, "15": true, "30": true, "45": false } },
    { route: "DEL-CCU", dgca_weight: 0.10, cells: { "1": false, "7": false, "15": false, "30": false, "45": false } },
    { route: "BLR-HYD", dgca_weight: 0.08, cells: { "1": false, "7": false, "15": false, "30": false, "45": false } },
  ],
};

export function CoverageMatrix() {
  const [data, setData] = useState<CoverageResponse>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.getCoverage().then((d) => {
      if (!cancelled && d) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Route x window coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-caption text-muted-foreground">
          Solid = real, scraped, end-to-end. Hatched = roadmap, not yet built - the honest
          contrast is the point, not the cell count (Build Order Phase 4).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-caption">
            <thead>
              <tr>
                <th className="p-2 text-left text-muted-foreground">Route</th>
                {WINDOWS.map((w) => (
                  <th key={w} className="p-2 text-center text-muted-foreground">T+{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((row) => (
                <tr key={row.route} className="border-t border-border">
                  <td className="p-2 text-foreground">{row.route}</td>
                  {WINDOWS.map((w) => {
                    const real = row.cells[String(w)];
                    return (
                      <td key={w} className="p-2 text-center">
                        <span
                          className={cn(
                            "mx-auto block h-6 w-6 rounded",
                            real
                              ? "bg-accent"
                              : "bg-[repeating-linear-gradient(45deg,hsl(var(--color-secondary)),hsl(var(--color-secondary))_3px,transparent_3px,transparent_6px)] border border-border"
                          )}
                          aria-label={real ? "scraped, real" : "roadmap, not yet scraped"}
                          title={real ? "Real, scraped" : "Roadmap"}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
