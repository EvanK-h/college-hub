"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { syncIfStale } from "@/app/(app)/actions";

// When the data is stale, starts a sync once after the dashboard opens and refreshes the page
// when it lands. Until then the cached data stays on screen; this only shows a quiet note.
export function AutoSync({ stale }: { stale: boolean }) {
  const router = useRouter();
  const started = useRef(false);
  const [syncing, setSyncing] = useState(false);

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

  return (
    <span role="status" className="text-xs text-tertiary-foreground">
      {syncing ? "Syncing…" : ""}
    </span>
  );
}
