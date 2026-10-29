"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncIfStale } from "@/app/(app)/actions";
import { syncNow } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// When the data is stale, starts a sync once after the dashboard opens and refreshes the page
// when it lands. Until then the cached data stays on screen. The refresh button syncs on demand;
// its icon spins while either kind of sync runs (it holds still under reduced motion, where the
// "Syncing…" text carries the feedback).
export function AutoSync({ stale }: { stale: boolean }) {
  const router = useRouter();
  const started = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // The ref keeps React's development double-run of effects from starting two syncs.
    if (!stale || started.current) return;
    started.current = true;
    setSyncing(true);
    syncIfStale()
      .then(({ synced }) => {
        if (synced) router.refresh();
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [stale, router]);

  function syncNowAndRefresh() {
    setSyncing(true);
    setFailed(false);
    syncNow()
      .then(({ status }) => {
        if (status === "error") setFailed(true);
        else router.refresh();
      })
      .catch(() => setFailed(true))
      .finally(() => setSyncing(false));
  }

  return (
    <>
      <span role="status" className={cn("text-xs empty:hidden", failed ? "text-destructive" : "text-tertiary-foreground")}>
        {syncing ? "Syncing…" : failed ? "Sync failed" : ""}
      </span>
      <Button type="button" variant="ghost" size="icon-xs" className="hit-area" onClick={syncNowAndRefresh} disabled={syncing} aria-label="Sync now">
        <RefreshCw aria-hidden className={cn(syncing && "motion-safe:animate-spin")} />
      </Button>
    </>
  );
}
