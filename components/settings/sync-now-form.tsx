"use client";

import { useActionState } from "react";
import { syncNow } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import type { SyncNowState } from "@/lib/sync/format";

const IDLE: SyncNowState = { status: "idle", message: "" };

// A sync makes several sequential Canvas calls, so it can take a few seconds. The button says so.
export function SyncNowForm() {
  const [state, formAction, pending] = useActionState(syncNow, IDLE);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5 sm:items-end">
      <Button type="submit" disabled={pending}>
        {pending ? "Syncing…" : "Sync now"}
      </Button>
      {/* Always rendered, so screen readers hear the result when it appears. */}
      <p
        role={state.status === "error" ? "alert" : "status"}
        className={state.status === "error" ? "max-w-xs text-sm text-destructive sm:text-right" : "max-w-xs text-sm text-muted-foreground sm:text-right"}
      >
        {state.message}
      </p>
    </form>
  );
}
