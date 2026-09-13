import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-row font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        accent: "bg-accent text-accent-foreground shadow-neu-sm hover:bg-accent/90 active:shadow-neu-inset-sm",
        outline: "bg-card text-foreground shadow-neu-sm hover:text-accent active:shadow-neu-inset-sm",
        ghost: "text-muted-foreground hover:bg-card hover:shadow-neu-sm hover:text-foreground active:shadow-neu-inset-sm",
        icon: "text-muted-foreground hover:bg-card hover:shadow-neu-sm hover:text-foreground active:shadow-neu-inset-sm rounded-full",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-caption",
        icon: "h-9 w-9 shrink-0",
      },
    },
    defaultVariants: { variant: "outline", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
