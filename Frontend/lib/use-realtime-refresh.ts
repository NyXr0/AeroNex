"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Bumps a counter whenever any row in `tables` changes via Supabase Realtime
// (postgres_changes on the public schema). Add the returned value to a data
// effect's dependency array to refetch on live writes instead of polling -
// e.g. `useEffect(() => { api.getIndex().then(...) }, [tick])`.
// No-op (never bumps, always 0) when Supabase isn't configured - see
// lib/supabase.ts - so every caller keeps working off its existing
// on-mount fetch either way.
export function useRealtimeRefresh(tables: string[]): number {
  const [tick, setTick] = useState(0);
  const key = tables.join(",");

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client.channel(`realtime:${key}`);
    for (const table of key.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => setTick((t) => t + 1));
    }
    channel.subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [key]);

  return tick;
}
