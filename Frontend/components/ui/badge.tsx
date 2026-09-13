import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground shadow-neu-inset-sm",
        accent: "bg-accent text-accent-foreground shadow-neu-sm",
        muted: "bg-card text-muted-foreground shadow-neu-inset-sm",
        outline: "bg-card text-muted-foreground shadow-neu-inset-sm",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
