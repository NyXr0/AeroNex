// Supabase client for realtime dashboard updates only (see
// use-realtime-refresh.ts). Optional: when the two NEXT_PUBLIC_SUPABASE_*
// env vars aren't set, `supabase` is null and realtime becomes a no-op -
// the dashboard still works via its existing on-load fetch (lib/api.ts),
// it just doesn't get live pushes. Same "disclosed graceful fallback"
// philosophy as the rest of the app.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
