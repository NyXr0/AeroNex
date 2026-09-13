"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api, type ComplianceResponse } from "@/lib/api";
import { SOURCE_ICONS, DEFAULT_ICON } from "@/components/dashboard/sources-list";

type Row = { name: string; lastScraped: string; share: number };

export function SourcesListClient({ fallback }: { fallback: Row[] }) {
  const [rows, setRows] = useState<Row[]>(fallback);
  const [fallbackLog, setFallbackLog] = useState<ComplianceResponse["latest_fallback_log"]>(null);

  useEffect(() => {
    let cancelled = false;
    api.getCompliance().then((data) => {
      if (cancelled || !data) return;
      if (data.sources.length > 0) {
        setRows(
          data.sources.map((s) => ({
            name: s.source,
            lastScraped: s.latest_provenance?.scraped_at
              ? new Date(s.latest_provenance.scraped_at).toLocaleString()
              : "no scrapes yet",
            share: 0,
          }))
        );
      }
      if (data.latest_fallback_log) setFallbackLog(data.latest_fallback_log);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
    {fallbackLog && (
      <p className="mb-2 rounded-md border border-border bg-secondary/40 px-2 py-1.5 text-caption text-muted-foreground">
        Last live attempt ({fallbackLog.origin}-{fallbackLog.destination}, T+{fallbackLog.window_days}):{" "}
        {fallbackLog.disclosure.map((d, i) => (
          <span key={i}>
            {i > 0 && " -> "}
            {d.source ?? "no source"}: {d.status}
          </span>
        ))}
      </p>
    )}
    <ul className="flex flex-col gap-1">
      {rows.map(({ name, lastScraped }) => {
        const Icon = SOURCE_ICONS[name] ?? DEFAULT_ICON;
        return (
          <li key={name} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary/60">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-row text-foreground">{name}</span>
              <span className="tabular block text-caption text-muted-foreground">{lastScraped}</span>
            </span>
            <Badge variant="outline" className="tabular">
              {name === "DEMO_SEED" ? "demo" : "src"}
            </Badge>
          </li>
        );
      })}
    </ul>
    </>
  );
}
