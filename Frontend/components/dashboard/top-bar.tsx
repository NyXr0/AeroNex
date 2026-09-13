"use client";

import { Search, SlidersHorizontal, Bell, ChevronDown, Circle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth";

function initialsFor(email: string | undefined): string {
  if (!email) return "AR";
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

export function TopBar() {
  const { session } = useSession();
  const email = session?.user.email;
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6 neu-divider-b">
      <div className="flex items-center gap-3">
        <span className="text-row text-muted-foreground">Wednesday, 18 Sep</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-caption font-medium text-accent">
          <Circle className="h-1.5 w-1.5 fill-current" aria-hidden="true" />
          Live &middot; scraping
        </span>
      </div>

      <label className="relative order-last w-full sm:order-none sm:max-w-md">
        <span className="sr-only">Search routes, sources, carriers</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search routes, sources, carriers&hellip;"
          className="h-10 w-full rounded-full bg-card shadow-neu-inset-sm pl-9 pr-10 text-row text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          aria-label="Filter results"
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:shadow-neu-sm hover:text-foreground cursor-pointer"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications, 2 unread"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:shadow-neu-sm hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-background" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-card hover:shadow-neu-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar initials={initialsFor(email)} size="md" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-row text-foreground">{email ?? "Aditi Rao"}</span>
            <span className="block text-caption text-muted-foreground">{email ? "Signed in" : "Ops Lead"}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
