import type { SyncOutcome } from "@/lib/sync/runs";
import type { Database } from "@/lib/database.types";

export type SyncStatus = Database["public"]["Enums"]["sync_status"];
export type SyncSource = Database["public"]["Enums"]["sync_source"];
type SyncRunRow = Database["public"]["Tables"]["sync_runs"]["Row"];

// Only the columns the settings page shows, so tests can build inputs without every field.
export type SyncRun = Pick<
  SyncRunRow,
  "id" | "source" | "status" | "started_at" | "finished_at" | "inserted" | "updated" | "unchanged" | "error_message"
>;

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  running: "Running",
  success: "Success",
  error: "Failed",
  token_expired: "Token expired",
};

/** What the "Sync now" button shows after it runs. */
export type SyncNowState = {
  status: "idle" | "success" | "skipped" | "error";
  message: string;
};

/** The button's message for a finished sync. Only short, fixed phrases and counts; no raw errors. */
export function describeSyncOutcome(outcome: SyncOutcome): SyncNowState {
  switch (outcome.status) {
    case "success":
      return { status: "success", message: `Synced: ${describeCounts(outcome.counts)}` };
    case "skipped":
      return { status: "skipped", message: "Another sync is already running. Check back in a moment." };
    case "token_expired":
      return { status: "error", message: "Canvas rejected the token. Replace it, then sync again." };
    case "error":
      // error_message was written by the sync itself: course codes and short reasons, never secrets.
      return { status: "error", message: `Sync finished with errors: ${outcome.error ?? "see the history below"}` };
  }
}

export const SYNC_SOURCE_LABELS: Record<SyncSource, string> = {
  canvas: "Canvas",
  timetable: "Timetable",
};

/**
 * The button's message after syncing everything: the Canvas result, plus the timetable's when it
 * ran (`timetable` is null while the feed isn't set up). The worse of the two sets the status.
 */
export function describeSyncNow(canvas: SyncOutcome, timetable: SyncOutcome | null): SyncNowState {
  const canvasState = describeSyncOutcome(canvas);
  if (!timetable) return canvasState;

  const timetableState = describeSyncOutcome(timetable);
  const rank = { idle: 0, success: 1, skipped: 2, error: 3 } as const;
  return {
    status: rank[timetableState.status] > rank[canvasState.status] ? timetableState.status : canvasState.status,
    message: `Canvas: ${canvasState.message} Timetable: ${timetableState.message}`,
  };
}

/** "just now", "12 min ago", "3 h ago", "2 d ago". */
export function formatRelativeTime(from: Date, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** "1 new · 2 updated · 40 unchanged", leaving out parts that are zero. */
export function describeCounts({ inserted, updated, unchanged }: Pick<SyncRun, "inserted" | "updated" | "unchanged">): string {
  const parts = [
    inserted > 0 && `${inserted} new`,
    updated > 0 && `${updated} updated`,
    unchanged > 0 && `${unchanged} unchanged`,
  ].filter((part): part is string => part !== false);
  return parts.length > 0 ? parts.join(" · ") : "Nothing to sync";
}

/** "4 s" or "1 min 5 s"; null while the run has not finished. */
export function formatDuration(startedAt: string, finishedAt: string | null): string | null {
  if (!finishedAt) return null;
  const seconds = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 1) return "<1 s";
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

/** A run's start time in the given time zone, with the zone's short name so it is never ambiguous. */
export function formatRunTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(iso));
}

/** The headline and supporting lines for the sync card, from the latest run and the last good one. */
export function describeLatestRun(
  latest: SyncRun | null,
  lastSuccess: SyncRun | null,
  now: Date,
  emptyHint = "Once your courses are linked to Canvas, syncs will show up here.",
): { headline: string; details: string[] } {
  if (!latest) {
    return { headline: "No syncs yet", details: [emptyHint] };
  }

  const ago = formatRelativeTime(new Date(latest.finished_at ?? latest.started_at), now);
  const lastGood = lastSuccess
    ? `Last successful sync ${formatRelativeTime(new Date(lastSuccess.finished_at ?? lastSuccess.started_at), now)}`
    : "No successful sync yet";

  switch (latest.status) {
    case "running":
      return { headline: "Syncing…", details: [`Started ${formatRelativeTime(new Date(latest.started_at), now)}`] };
    case "success":
      return { headline: `Synced ${ago}`, details: [describeCounts(latest)] };
    case "token_expired":
      return { headline: `Canvas token expired ${ago}`, details: [lastGood] };
    case "error":
      return {
        headline: `Last sync failed ${ago}`,
        details: [latest.error_message ?? "No details were recorded.", lastGood],
      };
  }
}
