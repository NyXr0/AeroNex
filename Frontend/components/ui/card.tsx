"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// Every card fades + rises in on mount - the one place this animation is
// defined, since Card is the base every dashboard panel is built from.
// `motionDelay` lets a caller stagger a list of cards (e.g. the National
// Dashboard's grid) without each one needing its own framer-motion setup.
export interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  motionDelay?: number;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, motionDelay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: motionDelay }}
      className={cn("rounded-md bg-card text-card-foreground shadow-neu", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between gap-2 p-5 pb-3", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-card-title text-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
