"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Real Supabase Auth session state, client-side. `loading` stays true only
// until the first session check resolves (Supabase persists sessions in
// localStorage, so this is usually instant on repeat visits). When Supabase
// isn't configured (see lib/supabase.ts) this reports "no session, done
// loading" forever - callers should treat that as "auth not set up", not
// as "signed out", if they need to tell the two apart.
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
