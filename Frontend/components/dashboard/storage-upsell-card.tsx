"use client";

import { ArrowRight, HardDrive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function StorageUpsellCard() {
  return (
    <Card className="flex items-center justify-between gap-3 bg-accent p-4 text-accent-foreground">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-foreground/10">
          <HardDrive className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-accent-foreground/10 text-accent-foreground">$0/mo</Badge>
            <span className="text-caption">local disk volume</span>
          </div>
          <p className="text-row font-semibold leading-tight">Snapshot storage</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="border-accent-foreground/20 text-accent-foreground hover:bg-accent-foreground/10"
        aria-label="See object-storage upgrade options for snapshots"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Card>
  );
}
