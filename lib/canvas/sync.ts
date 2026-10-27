import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { CanvasAuthError, type CanvasClient } from "./client";
import { guessKind } from "./kind";
import type { CanvasAnnouncement, CanvasAssignmentGroup } from "./schemas";
import { addCounts, describeError, NO_COUNTS, withSyncRun, type SyncCounts, type SyncOutcome } from "@/lib/sync/runs";

type Db = SupabaseClient<Database>;

export type SyncOptions = {
  /** Supabase client with the service-role key (lib/supabase/admin.ts). */
  db: Db;
  canvas: CanvasClient;
  /** Your user id. The service role has no auth.uid(), so the sync passes the owner explicitly. */
  ownerId: string;
  now?: Date;
};

const ANNOUNCEMENT_WINDOW_DAYS = 60;

// Row shapes sent to the SQL functions. They are `type`s, not interfaces, so they count as JSON.
type GroupRow = { canvas_id: number; name: string; weight: number | null; position: number | null };
type AssignmentRow = {
  canvas_id: number;
  assignment_group_id: number;
  title: string;
  kind: Database["public"]["Enums"]["assignment_kind"];
  due_at: string | null;
  points_possible: number | null;
  html_url: string;
  workflow_state: string | null;
  score: number | null;
  submitted_at: string | null;
};
type AnnouncementRow = {
  canvas_id: number;
  title: string;
  message: string | null;
  author: string | null;
  posted_at: string | null;
  html_url: string;
};

export function toGroupRows(groups: CanvasAssignmentGroup[]): GroupRow[] {
  return groups.map((group) => ({
    canvas_id: group.id,
    name: group.name,
    weight: group.group_weight ?? null,
    position: group.position ?? null,
  }));
}

export function toAssignmentRows(groups: CanvasAssignmentGroup[]): AssignmentRow[] {
  return groups.flatMap((group) =>
    group.assignments.map((assignment) => ({
      canvas_id: assignment.id,
      assignment_group_id: assignment.assignment_group_id,
      title: assignment.name,
      // Only used when the row is inserted; the SQL function never updates `kind`.
      kind: guessKind(assignment.submission_types, assignment.name),
      due_at: assignment.due_at ?? null,
      points_possible: assignment.points_possible ?? null,
      html_url: assignment.html_url,
      workflow_state: assignment.submission?.workflow_state ?? null,
      score: assignment.submission?.score ?? null,
      submitted_at: assignment.submission?.submitted_at ?? null,
    })),
  );
}

export function toAnnouncementRows(announcements: CanvasAnnouncement[]): AnnouncementRow[] {
  return announcements.map((announcement) => ({
    canvas_id: announcement.id,
    title: announcement.title,
    message: announcement.message ?? null,
    author: announcement.user_name ?? null,
    posted_at: announcement.posted_at ?? null,
    html_url: announcement.html_url,
  }));
}

type SyncFunction = "sync_assignment_groups" | "sync_assignments" | "sync_announcements";

/** Calls one of the SQL upsert functions (see the add_canvas_sync_functions migration). */
async function callSyncFunction(
  db: Db,
  fn: SyncFunction,
  ownerId: string,
  courseId: string,
  rows: GroupRow[] | AssignmentRow[] | AnnouncementRow[],
): Promise<SyncCounts> {
  const { data, error } = await db.rpc(fn, { p_owner: ownerId, p_course_id: courseId, p_rows: rows });
  if (error) throw new Error(`${fn} failed: ${error.message}`);
  const counts = data?.[0];
  if (!counts) throw new Error(`${fn} returned no counts`);
  return counts;
}

/**
 * Syncs one course. Everything is fetched from Canvas before anything is written, so a failed or
 * partial fetch throws first and never reaches the soft-delete step in sync_assignments.
 */
async function syncCourse(
  { db, canvas, ownerId, now }: Required<SyncOptions>,
  course: { id: string; canvasCourseId: number },
): Promise<SyncCounts> {
  const since = new Date(now.getTime() - ANNOUNCEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const groups = await canvas.listAssignmentGroups(course.canvasCourseId);
  const announcements = await canvas.listAnnouncements(course.canvasCourseId, since);

  // Groups first so each assignment's group exists by the time the assignment is written.
  let counts = await callSyncFunction(db, "sync_assignment_groups", ownerId, course.id, toGroupRows(groups));
  counts = addCounts(counts, await callSyncFunction(db, "sync_assignments", ownerId, course.id, toAssignmentRows(groups)));
  counts = addCounts(counts, await callSyncFunction(db, "sync_announcements", ownerId, course.id, toAnnouncementRows(announcements)));
  return counts;
}

/**
 * Runs a full Canvas sync, one mapped course at a time, and records it in `sync_runs`.
 * Re-running it is always safe: the SQL functions only ever write synced columns.
 * A 401 stops the run and records `token_expired`; any other failure is recorded against
 * its course and the remaining courses still run. If another sync is already running it does
 * nothing and returns `skipped`.
 */
export async function syncCanvas(options: SyncOptions): Promise<SyncOutcome> {
  const { db, ownerId } = options;
  const resolved = { ...options, now: options.now ?? new Date() };

  return withSyncRun(db, { ownerId, source: "canvas", now: resolved.now }, async () => {
    const { data: courses, error: coursesError } = await db
      .from("courses")
      .select("id, code, canvas_course_id")
      .eq("owner_id", ownerId)
      .not("canvas_course_id", "is", null);
    if (coursesError) throw new Error(`could not read courses: ${coursesError.message}`);

    let counts = NO_COUNTS;
    const failures: string[] = [];

    for (const course of courses) {
      if (course.canvas_course_id === null) continue;
      try {
        counts = addCounts(counts, await syncCourse(resolved, { id: course.id, canvasCourseId: course.canvas_course_id }));
      } catch (error) {
        if (error instanceof CanvasAuthError) {
          return { status: "token_expired", counts, failures: [error.message] };
        }
        failures.push(`${course.code}: ${describeError(error)}`);
      }
    }
    return { status: failures.length > 0 ? "error" : "success", counts, failures };
  });
}
