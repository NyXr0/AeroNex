import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { RouteHeader } from "@/components/dashboard/route-header";
import { RouteHeroCard } from "@/components/dashboard/route-hero-card";
import { ScrapeSessionCard } from "@/components/dashboard/scrape-session-card";
import { CoverageDonut } from "@/components/dashboard/coverage-donut";
import { StatCards } from "@/components/dashboard/stat-cards";
import { StorageUpsellCard } from "@/components/dashboard/storage-upsell-card";
import { ScheduleCalendar } from "@/components/dashboard/schedule-calendar";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { SourcesList } from "@/components/dashboard/sources-list";
import { DataStatusBanner } from "@/components/dashboard/data-status-banner";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col">
        <TopBar />
        <RouteHeader />
        <DataStatusBanner />

        <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:p-6">
          {/* Left column: route + stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-1">
            <div className="sm:col-span-1 lg:h-[200px]">
              <RouteHeroCard />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <StatCards />
            </div>
            <div className="sm:col-span-3 lg:col-span-1">
              <StorageUpsellCard />
            </div>
          </div>

          {/* Center column: live session, donut, schedule */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ScrapeSessionCard />
              <CoverageDonut />
            </div>
            <div className="flex-1">
              <ScheduleCalendar />
            </div>
          </div>

          {/* Right column: activity + sources */}
          <div className="flex flex-col gap-4 lg:col-span-4">
            <ActivityHeatmap />
            <SourcesList />
          </div>
        </main>
      </div>
    </div>
  );
}
