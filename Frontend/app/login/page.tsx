"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlaneTakeoff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/auth";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-sm p-6 text-center">
          <p className="text-row text-muted-foreground">
            Sign-in isn&apos;t configured yet on this deployment (missing Supabase environment
            variables) - see <code className="text-caption">Frontend/.env.example</code>.
          </p>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      if (mode === "sign-in") {
        const { error: err } = await supabase!.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.replace("/dashboard");
      } else {
        const { data, error: err } = await supabase!.auth.signUp({ email, password });
        if (err) throw err;
        if (data.session) {
          router.replace("/dashboard");
        } else {
          setMessage("Account created - check your email to confirm before signing in.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <PlaneTakeoff className="h-5 w-5" aria-hidden="true" />
          </span>
          <CardHeader className="p-0">
            <CardTitle>{mode === "sign-in" ? "Sign in to AeroNex" : "Create your AeroNex account"}</CardTitle>
          </CardHeader>
        </div>

        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-caption text-muted-foreground">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-md bg-card px-3 text-row text-foreground shadow-neu-inset-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-muted-foreground">Password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-md bg-card px-3 text-row text-foreground shadow-neu-inset-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            {error && <p className="text-caption text-destructive">{error}</p>}
            {message && <p className="text-caption text-muted-foreground">{message}</p>}

            <Button type="submit" variant="accent" disabled={submitting} className="mt-2 justify-center">
              {submitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
            </Button>
          </form>

          <p className="mt-4 text-center text-caption text-muted-foreground">
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => setMode("sign-up")} className="text-accent hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("sign-in")} className="text-accent hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
          <p className="mt-2 text-center text-caption text-muted-foreground">
            <Link href="/" className="hover:underline">
              &larr; Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
