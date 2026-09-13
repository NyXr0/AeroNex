"use client";

import { useEffect } from "react";
import { useSpring, useTransform, motion } from "framer-motion";

/**
 * Rolling-counter number: springs from the previous value to `value`
 * whenever it changes, instead of the digits just jumping - the visible
 * "this is live" cue for anything backed by real-time data (stat tiles,
 * headline index, coverage %). `format` renders the interpolated number
 * (e.g. formatINR, toFixed(1), a percent sign) each frame. First render
 * shows `value` immediately (no animate-up-from-zero) - only later
 * changes to `value` trigger the spring.
 */
export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString("en-IN"),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const spring = useSpring(value, { stiffness: 120, damping: 20, mass: 0.6 });
  const display = useTransform(spring, (n) => format(n));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}
