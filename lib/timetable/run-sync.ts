import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv, getTimetableFeedUrl } from "@/lib/env.server";
import type { SyncOutcome } from "@/lib/sync/runs";
import { fetchTimetableFeed } from "./feed";
import { syncTimetable } from "./sync";

/**
 * Builds the real clients from the environment and runs one timetable sync. Until OUTLOOK_ICS_URL
 * is set it does nothing and reports `skipped`, so the Canvas sync can run on its own.
 */
export async function runTimetableSync(): Promise<SyncOutcome> {
  const url = getTimetableFeedUrl();
  if (!url) return { status: "skipped", reason: "OUTLOOK_ICS_URL is not set" };

  return syncTimetable({
    db: createAdminClient(),
    fetchFeed: () => fetchTimetableFeed(url),
    ownerId: getAdminEnv().OWNER_ID,
  });
}
