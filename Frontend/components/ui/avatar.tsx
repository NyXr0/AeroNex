import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string;
  size?: "sm" | "md";
  ring?: boolean;
}

/**
 * Initials-based avatar (no external image dependency) — every "person" in this
 * dashboard is a placeholder identity, so we avoid pulling in unlicensed stock
 * photos and render a deterministic initials badge instead.
 */
export function Avatar({ initials, size = "md", ring, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-secondary shadow-neu-sm font-semibold text-foreground",
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-caption",
        ring && "ring-2 ring-background",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {initials}
    </div>
  );
}
