"use client";

import {
  PlaneTakeoff,
  TrendingUp,
  Activity,
  LineChart,
  CalendarClock,
  PieChart,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Each item is a real, wired-up page - not a placeholder link back to
// /dashboard (that was the previous nav's actual state: Routes/Compliance/
// Backtest/Sources/Schedule all pointed at the same Overview page).
const NAV_ITEMS = [
  { label: "National Dashboard", icon: PlaneTakeoff, href: "/dashboard" },
  { label: "Price Trend", icon: TrendingUp, href: "/dashboard/price-trend" },
  { label: "Airfare Index", icon: Activity, href: "/dashboard/airfare-index" },
  { label: "CPI Analysis", icon: LineChart, href: "/dashboard/cpi-analysis" },
  { label: "T Windows", icon: CalendarClock, href: "/dashboard/windows" },
  { label: "Fare Breakdown", icon: PieChart, href: "/dashboard/fare-breakdown" },
  { label: "Methodology", icon: BookOpen, href: "/methodology" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="hidden lg:flex lg:w-16 lg:flex-col lg:items-center lg:justify-between lg:bg-primary lg:py-5 neu-divider-r"
      aria-label="Primary"
    >
      <div className="flex flex-col items-center gap-6">
        <Link href="/dashboard" aria-label="AeroNex home" className="flex h-9 w-9 items-center justify-center">
          <Image src="/logo-mark.png" alt="" width={36} height={36} priority className="h-9 w-9 object-contain" />
        </Link>

        <nav className="flex flex-col items-center gap-1">
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                title={label}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-card hover:shadow-neu-sm hover:text-foreground cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-card text-accent shadow-neu-inset-sm"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-card hover:shadow-neu-sm hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Log out"
          title="Log out"
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-card hover:shadow-neu-sm hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}
