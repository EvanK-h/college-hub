import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { CanvasAuthError, type CanvasClient } from "./client";
import { guessKind } from "./kind";
import type { CanvasAnnouncement, CanvasAssignmentGroup } from "./schemas";

type Db = SupabaseClient<Database>;
type SyncStatus = Database["public"]["Enums"]["sync_status"];

export type SyncCounts = { inserted: number; updated: number; unchanged: number };

export type SyncResult = {
  runId: string;
  status: Exclude<SyncStatus, "running">;
  counts: SyncCounts;
  /** A short reason for `error` and `token_expired`; never headers or tokens. */
  error: string | null;
};

export type SyncOptions = {
  /** Supabase client with the service-role key (lib/supabase/admin.ts). */
  db: Db;
  canvas: CanvasClient;
  /** Your user id. The service role has no auth.uid(), so the sync passes the owner explicitly. */
  ownerId: string;
  now?: Date;
};

const ANNOUNCEMENT_WINDOW_DAYS = 60;
const MAX_ERROR_LENGTH = 500;

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

function addCounts(a: SyncCounts, b: SyncCounts): SyncCounts {
  return {
    inserted: a.inserted + b.inserted,
    updated: a.updated + b.updated,
    unchanged: a.unchanged + b.unchanged,
  };
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown error";
  return message.slice(0, MAX_ERROR_LENGTH);
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
  let counts: SyncCounts = { inserted: 0, updated: 0, unchanged: 0 };
  counts = addCounts(counts, await callSyncFunction(db, "sync_assignment_groups", ownerId, course.id, toGroupRows(groups)));
  counts = addCounts(counts, await callSyncFunction(db, "sync_assignments", ownerId, course.id, toAssignmentRows(groups)));
  counts = addCounts(counts, await callSyncFunction(db, "sync_announcements", ownerId, course.id, toAnnouncementRows(announcements)));
  return counts;
}

/**
 * Runs a full Canvas sync, one mapped course at a time, and records it in `sync_runs`.
 * Re-running it is always safe: the SQL functions only ever write synced columns.
 * A 401 stops the run and records `token_expired`; any other failure is recorded against
 * its course and the remaining courses still run.
 */
export async function syncCanvas(options: SyncOptions): Promise<SyncResult> {
  const { db, ownerId } = options;
  const resolved = { ...options, now: options.now ?? new Date() };

  const { data: run, error: runError } = await db
    .from("sync_runs")
    .insert({ source: "canvas", status: "running", owner_id: ownerId })
    .select("id")
    .single();
  if (runError) throw new Error(`could not record the sync run: ${runError.message}`);

  let counts: SyncCounts = { inserted: 0, updated: 0, unchanged: 0 };
  let status: SyncResult["status"] = "success";
  const failures: string[] = [];

  try {
    const { data: courses, error: coursesError } = await db
      .from("courses")
      .select("id, code, canvas_course_id")
      .eq("owner_id", ownerId)
      .not("canvas_course_id", "is", null);
    if (coursesError) throw new Error(`could not read courses: ${coursesError.message}`);

    for (const course of courses) {
      if (course.canvas_course_id === null) continue;
      try {
        counts = addCounts(counts, await syncCourse(resolved, { id: course.id, canvasCourseId: course.canvas_course_id }));
      } catch (error) {
        if (error instanceof CanvasAuthError) {
          status = "token_expired";
          failures.length = 0;
          failures.push(error.message);
          break;
        }
        failures.push(`${course.code}: ${describeError(error)}`);
      }
    }
    if (status === "success" && failures.length > 0) status = "error";
  } catch (error) {
    // Something outside a single course (e.g. reading the course list) failed.
    status = "error";
    failures.push(describeError(error));
  }

  const errorMessage = failures.length > 0 ? failures.join("; ").slice(0, MAX_ERROR_LENGTH) : null;

  const { error: finishError } = await db
    .from("sync_runs")
    .update({ status, finished_at: new Date().toISOString(), ...counts, error_message: errorMessage })
    .eq("id", run.id);
  if (finishError) throw new Error(`could not finish the sync run: ${finishError.message}`);

  return { runId: run.id, status, counts, error: errorMessage };
}
