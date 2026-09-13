"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Gates every /dashboard/* route behind a real Supabase Auth session.
// When Supabase isn't configured at all (see lib/supabase.ts), this is a
// no-op pass-through instead of a dead end - same disclosed-fallback
// philosophy as the rest of the app: optional infra missing should never
// lock you out of local dev.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (supabase && (loading || !session)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-row text-muted-foreground">Checking your session&hellip;</p>
      </div>
    );
  }

  return <>{children}</>;
}
