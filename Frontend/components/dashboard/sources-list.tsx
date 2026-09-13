import { PlaneTakeoff, Ticket, Globe, ShoppingBag, FileSpreadsheet, MoreHorizontal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourcesListClient } from "@/components/dashboard/sources-list-client";

// Icon lookup by source name - kept here (server-safe) since lucide icon
// components can't be sent through client state as-is.
export const SOURCE_ICONS: Record<string, typeof PlaneTakeoff> = {
  IndiGo: PlaneTakeoff,
  "Air India": PlaneTakeoff,
  EaseMyTrip: Ticket,
  Cleartrip: Globe,
  MakeMyTrip: ShoppingBag,
  DEMO_SEED: FileSpreadsheet,
};
export const DEFAULT_ICON = Globe;

// Icons are resolved by name in the client component (SOURCE_ICONS lookup) -
// never embed an actual icon component reference here, it can't cross the
// server/client prop boundary (Next.js can't serialize a component/function).
const FALLBACK_SOURCES = [
  { name: "EaseMyTrip", lastScraped: "not yet run", share: 0 },
  { name: "DGCA (historical)", lastScraped: "sample data", share: 0 },
];

export function SourcesList() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Sources</CardTitle>
          <Badge variant="muted">live</Badge>
        </div>
        <Button variant="icon" size="icon" aria-label="Source options">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent>
        <SourcesListClient fallback={FALLBACK_SOURCES} />
      </CardContent>
    </Card>
  );
}
