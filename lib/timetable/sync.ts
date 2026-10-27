import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { withSyncRun, type SyncCounts, type SyncOutcome } from "@/lib/sync/runs";
import { parseTimetable, type ParsedSession } from "./parse";
import type { SessionType } from "./kind";

type Db = SupabaseClient<Database>;

export type TimetableSyncOptions = {
  /** Supabase client with the service-role key (lib/supabase/admin.ts). */
  db: Db;
  /** Returns the ICS text; lib/timetable/feed.ts in production, a fixture in tests. */
  fetchFeed: () => Promise<string>;
  /** Your user id. The service role has no auth.uid(), so the sync passes the owner explicitly. */
  ownerId: string;
  now?: Date;
};

// Recent sessions are refreshed too, so a late room change still lands; only future sessions can
// be marked cancelled, since feeds often drop past events.
const PAST_DAYS = 14;
const FUTURE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

// Row shape sent to sync_class_sessions. A `type`, not an interface, so it counts as JSON.
type SessionRow = {
  ics_uid: string;
  recurrence_id: string | null;
  course_id: string;
  kind: SessionType;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  cancelled: boolean;
};

/** Turns parsed sessions into rows, dropping those whose course code is not in your plan. */
export function toSessionRows(sessions: ParsedSession[], courseIdsByCode: ReadonlyMap<string, string>): SessionRow[] {
  return sessions.flatMap((session) => {
    const courseId = courseIdsByCode.get(session.courseCode);
    if (!courseId) return [];
    return [
      {
        ics_uid: session.icsUid,
        recurrence_id: session.recurrenceId?.toISOString() ?? null,
        course_id: courseId,
        // Only used when the row is inserted; the SQL function never updates `kind`.
        kind: session.kind,
        title: session.title,
        starts_at: session.startsAt.toISOString(),
        ends_at: session.endsAt.toISOString(),
        location: session.location,
        cancelled: session.cancelled,
      },
    ];
  });
}

/**
 * Downloads and parses the timetable feed, then upserts its sessions into `class_sessions` and
 * records the run in `sync_runs`. Re-running it is always safe. The feed is parsed in full before
 * anything is written, and a feed with no matching classes is refused, so a broken download can
 * never mark the whole timetable cancelled.
 */
export async function syncTimetable(options: TimetableSyncOptions): Promise<SyncOutcome> {
  const { db, fetchFeed, ownerId } = options;
  const now = options.now ?? new Date();

  return withSyncRun(db, { ownerId, source: "timetable", now }, async () => {
    const from = new Date(now.getTime() - PAST_DAYS * DAY_MS);
    const to = new Date(now.getTime() + FUTURE_DAYS * DAY_MS);
    const sessions = parseTimetable(await fetchFeed(), { from, to });

    const { data: courses, error: coursesError } = await db.from("courses").select("id, code").eq("owner_id", ownerId);
    if (coursesError) throw new Error(`could not read courses: ${coursesError.message}`);

    const rows = toSessionRows(sessions, new Map(courses.map((course) => [course.code, course.id])));
    if (rows.length === 0) {
      throw new Error(
        sessions.length === 0
          ? "the feed has no classes in range; nothing was changed"
          : "none of the feed's classes match a course in your plan; nothing was changed",
      );
    }

    const { data, error } = await db.rpc("sync_class_sessions", {
      p_owner: ownerId,
      p_rows: rows,
      p_cancel_from: now.toISOString(),
      p_cancel_to: to.toISOString(),
    });
    if (error) throw new Error(`sync_class_sessions failed: ${error.message}`);
    const counts: SyncCounts | undefined = data?.[0];
    if (!counts) throw new Error("sync_class_sessions returned no counts");

    return { status: "success", counts, failures: [] };
  });
}
