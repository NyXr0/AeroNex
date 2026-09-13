"use client";

import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/motion/animated-number";

// Segment order matters: it's drawn as one continuous stroke-dasharray ring.
const SEGMENTS = [
  { label: "Live scraped", value: 70, colorClass: "text-accent" },
  { label: "Historical (DGCA)", value: 22, colorClass: "text-foreground/70" },
  { label: "Disclosed fallback", value: 8, colorClass: "text-muted-foreground" },
];

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CONFIDENCE = 94;

export function CoverageDonut() {
  let offset = 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Data coverage</CardTitle>
        <Button variant="icon" size="icon" aria-label="Coverage options">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="relative h-[150px] w-[150px]">
          <motion.svg
            viewBox="0 0 130 130"
            className="h-full w-full -rotate-90"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <circle
              cx="65"
              cy="65"
              r={RADIUS}
              fill="none"
              stroke="hsl(var(--color-secondary))"
              strokeWidth="12"
            />
            {SEGMENTS.map((seg) => {
              const length = (seg.value / 100) * CIRCUMFERENCE;
              const dasharray = `${length} ${CIRCUMFERENCE - length}`;
              const el = (
                <circle
                  key={seg.label}
                  cx="65"
                  cy="65"
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={dasharray}
                  strokeDashoffset={-offset}
                  className={seg.colorClass}
                />
              );
              offset += length;
              return el;
            })}
          </motion.svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-stat text-foreground">
              <AnimatedNumber value={CONFIDENCE} format={(n) => `${Math.round(n)}%`} />
            </span>
            <span className="text-caption text-muted-foreground">confidence</span>
          </div>
        </div>

        <ul className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {SEGMENTS.map((seg) => (
            <li key={seg.label} className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full bg-current ${seg.colorClass}`}
                aria-hidden="true"
              />
              {seg.value}% {seg.label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
