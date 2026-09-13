"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, RadioTower, BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const FEATURES = [
  {
    icon: Activity,
    title: "Real-time airfare index",
    body: "A fixed-weight price index computed from live fares, not a static snapshot — updates the moment new data lands, no polling.",
  },
  {
    icon: RadioTower,
    title: "Live scraped fares",
    body: "Real Playwright-driven scrapes of EaseMyTrip for 3 locked routes across T+1/T+15/T+30 booking windows.",
  },
  {
    icon: ShieldCheck,
    title: "Disclosed, never silent",
    body: "Every screen labels demo-fallback data honestly — robots.txt compliance and provenance are logged for every fare.",
  },
  {
    icon: BookOpen,
    title: "Transparent methodology",
    body: "The index formula, DGCA route weights, and outlier handling are all documented on the Methodology page — no black box.",
  },
];

export default function LandingPage() {
  const { session, loading } = useSession();
  const signedIn = !loading && !!session;
  const primaryHref = supabase ? (signedIn ? "/dashboard" : "/login") : "/dashboard";
  const primaryLabel = supabase ? (signedIn ? "Go to dashboard" : "Get started") : "View dashboard";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="text-row font-semibold">AeroNex</span>
        </Link>
        {supabase && !signedIn && (
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </Link>
        )}
      </header>

      <main className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-24 pt-12 text-center lg:pt-20">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-full bg-accent/10 px-3 py-1 text-caption font-medium text-accent"
        >
          DGCA-compliance-monitoring airfare price index
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mt-5 text-[40px] font-bold leading-tight lg:text-[56px]"
        >
          Airfare pricing, tracked in real time.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 max-w-2xl text-row text-muted-foreground"
        >
          AeroNex scrapes, indexes, and publishes domestic airfare data across India&apos;s
          highest-traffic routes — live fares, a transparent price index, and full provenance on
          every number.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href={primaryHref}>
            <Button variant="accent" className="gap-1.5">
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/methodology">
            <Button variant="outline">Read the methodology</Button>
          </Link>
        </motion.div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Card key={title} motionDelay={0.2 + i * 0.08} className="p-5">
              <CardContent className="flex flex-col gap-2 p-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <p className="text-row font-semibold text-foreground">{title}</p>
                <p className="text-caption text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
