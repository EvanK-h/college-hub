import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { readLocalSupabase, testCourseType } from "@/test/local-supabase";
import { CanvasAuthError, type CanvasClient } from "./client";
import type { CanvasAnnouncement, CanvasAssignment, CanvasAssignmentGroup } from "./schemas";
import { syncCanvas } from "./sync";

// These tests run the real SQL upsert functions, so they need the local Supabase stack
// (`supabase start`); see test/local-supabase.ts.
const local = readLocalSupabase();

// All data is invented. Owner ids are made up (owner_id has no foreign key to auth.users), so test
// rows can never mix with yours, and every row is removed again afterwards.
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER_OWNER = "22222222-2222-4222-8222-222222222222";
const TERM_ID = 30001;
const COURSE_1 = 9_000_000_101; // Canvas course ids
const COURSE_2 = 9_000_000_102;
const GROUP = 9_000_008_001;
const PROBLEM_SET = 9_000_009_101;
const MIDTERM = 9_000_009_102;
const ANNOUNCEMENT = 9_000_007_101;

type World = {
  groups: Map<number, CanvasAssignmentGroup[]>;
  announcements: Map<number, CanvasAnnouncement[]>;
  failures: Map<number, Error>;
};

/** A stand-in for the Canvas client that serves whatever the test's "world" currently holds. */
function fakeCanvas(world: World): CanvasClient {
  return {
    listActiveCourses: async () => [],
    listAssignmentGroups: async (canvasCourseId) => {
      const failure = world.failures.get(canvasCourseId);
      if (failure) throw failure;
      return world.groups.get(canvasCourseId) ?? [];
    },
    listAnnouncements: async (canvasCourseId) => world.announcements.get(canvasCourseId) ?? [],
  };
}

const problemSet = (overrides: Partial<CanvasAssignment> = {}): CanvasAssignment => ({
  id: PROBLEM_SET,
  name: "Problem Set 1",
  assignment_group_id: GROUP,
  due_at: "2026-11-02T23:59:00Z",
  points_possible: 20,
  html_url: "https://canvas.example.edu/courses/1/assignments/1",
  submission_types: ["online_upload"],
  submission: { workflow_state: "unsubmitted", score: null, submitted_at: null },
  ...overrides,
});

const midterm = (): CanvasAssignment => ({
  id: MIDTERM,
  name: "Midterm Exam",
  assignment_group_id: GROUP,
  due_at: "2026-11-10T15:00:00Z",
  points_possible: 100,
  html_url: "https://canvas.example.edu/courses/1/assignments/2",
  submission_types: ["online_quiz"],
  submission: null,
});

const group = (assignments: CanvasAssignment[]): CanvasAssignmentGroup => ({
  id: GROUP,
  name: "Problem Sets",
  position: 1,
  group_weight: 40,
  assignments,
});

const announcement = (overrides: Partial<CanvasAnnouncement> = {}): CanvasAnnouncement => ({
  id: ANNOUNCEMENT,
  title: "Room change",
  message: "<p>We now meet in room 2.</p>",
  posted_at: "2026-10-26T09:00:00Z",
  html_url: "https://canvas.example.edu/courses/1/discussion_topics/1",
  user_name: "Prof. Example",
  ...overrides,
});

describe.skipIf(!local)("Canvas sync against the local database", () => {
  // The placeholders are never used: the suite is skipped when `local` is null.
  const db = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.serviceKey ?? "unused", {
    auth: { persistSession: false },
  });
  let world: World;
  let courseIds: { first: string; second: string };

  const check = ({ error }: { error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
  };

  async function cleanUp() {
    // Deleting the courses cascades to their groups, assignments and announcements.
    check(await db.from("sync_runs").delete().eq("owner_id", OWNER));
    check(await db.from("courses").delete().eq("owner_id", OWNER));
  }

  const attemptSync = () => syncCanvas({ db, canvas: fakeCanvas(world), ownerId: OWNER });

  /** Like attemptSync, but fails the test if the sync was skipped. */
  async function runSync() {
    const outcome = await attemptSync();
    if (outcome.status === "skipped") throw new Error(`sync was skipped: ${outcome.reason}`);
    return outcome;
  }

  async function assignmentRow(canvasId: number) {
    const { data, error } = await db.from("assignments").select("*").eq("canvas_id", canvasId).single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function announcementRow(canvasId: number) {
    const { data, error } = await db.from("announcements").select("*").eq("canvas_id", canvasId).single();
    if (error) throw new Error(error.message);
    return data;
  }

  beforeAll(async () => {
    await cleanUp();
    check(
      await db
        .from("terms")
        .upsert({ id: TERM_ID, name: "Test term (db tests)", kind: "semester", owner_id: OWNER }),
    );
  });

  beforeEach(async () => {
    await cleanUp();
    const type = await testCourseType(db, OWNER);
    const { data, error } = await db
      .from("courses")
      .insert([
        { code: "TEST 1000", title: "Test One", credits: 4, course_type_id: type, term_id: TERM_ID, canvas_course_id: COURSE_1, owner_id: OWNER },
        { code: "TEST 2000", title: "Test Two", credits: 4, course_type_id: type, term_id: TERM_ID, canvas_course_id: COURSE_2, owner_id: OWNER },
      ])
      .select("id, canvas_course_id");
    if (error) throw new Error(error.message);
    courseIds = {
      first: data.find((course) => course.canvas_course_id === COURSE_1)?.id ?? "",
      second: data.find((course) => course.canvas_course_id === COURSE_2)?.id ?? "",
    };

    world = {
      groups: new Map([[COURSE_1, [group([problemSet(), midterm()])]]]),
      announcements: new Map([[COURSE_1, [announcement()]]]),
      failures: new Map(),
    };
  });

  afterAll(async () => {
    await cleanUp();
    check(await db.from("terms").delete().eq("id", TERM_ID));
  });

  it("inserts groups, assignments and announcements and records the run", async () => {
    const result = await runSync();

    expect(result).toMatchObject({ status: "success", error: null, counts: { inserted: 4, updated: 0, unchanged: 0 } });

    const exam = await assignmentRow(MIDTERM);
    expect(exam).toMatchObject({ title: "Midterm Exam", kind: "exam", course_id: courseIds.first, owner_id: OWNER });

    const { data: run } = await db.from("sync_runs").select("*").eq("id", result.runId).single();
    expect(run).toMatchObject({ source: "canvas", status: "success", inserted: 4, updated: 0, unchanged: 0 });
    expect(run?.finished_at).not.toBeNull();
  });

  it("reports everything as unchanged when nothing changed in Canvas", async () => {
    await runSync();
    const result = await runSync();

    expect(result.counts).toEqual({ inserted: 0, updated: 0, unchanged: 4 });
  });

  it("updates Canvas's columns on a re-sync but never touches yours", async () => {
    await runSync();

    // Everything the site lets you edit, set to values Canvas would never send.
    check(
      await db
        .from("assignments")
        .update({ progress: "in_progress", priority: "high", est_hours: 3, notes: "my own notes", kind: "lab" })
        .eq("canvas_id", PROBLEM_SET),
    );
    check(await db.from("announcements").update({ read: true, important: true }).eq("canvas_id", ANNOUNCEMENT));

    // Canvas changes the synced fields of both rows.
    world.groups.set(COURSE_1, [
      group([
        problemSet({
          name: "Problem Set 1 (revised)",
          due_at: "2026-11-05T23:59:00Z",
          submission: { workflow_state: "graded", score: 18, submitted_at: "2026-11-01T10:00:00Z" },
        }),
        midterm(),
      ]),
    ]);
    world.announcements.set(COURSE_1, [announcement({ title: "Room change (updated)" })]);

    const result = await runSync();
    expect(result.counts).toEqual({ inserted: 0, updated: 2, unchanged: 2 });

    const assignment = await assignmentRow(PROBLEM_SET);
    // Synced columns follow Canvas...
    expect(assignment.title).toBe("Problem Set 1 (revised)");
    expect(new Date(assignment.due_at ?? "").toISOString()).toBe("2026-11-05T23:59:00.000Z");
    expect(assignment.workflow_state).toBe("graded");
    expect(assignment.score).toBe(18);
    // ...and yours are exactly as you left them, including the corrected kind.
    expect(assignment).toMatchObject({
      progress: "in_progress",
      priority: "high",
      est_hours: 3,
      notes: "my own notes",
      kind: "lab",
    });

    const post = await announcementRow(ANNOUNCEMENT);
    expect(post.title).toBe("Room change (updated)");
    expect(post).toMatchObject({ read: true, important: true });
  });

  it("marks an assignment that vanished from Canvas as deleted, keeps your notes, and un-marks it if it returns", async () => {
    await runSync();
    check(await db.from("assignments").update({ notes: "study chapters 1-4" }).eq("canvas_id", MIDTERM));

    world.groups.set(COURSE_1, [group([problemSet()])]);
    const removed = await runSync();
    expect(removed.counts.updated).toBe(1);
    expect(await assignmentRow(MIDTERM)).toMatchObject({ deleted_in_canvas: true, notes: "study chapters 1-4" });

    world.groups.set(COURSE_1, [group([problemSet(), midterm()])]);
    await runSync();
    expect(await assignmentRow(MIDTERM)).toMatchObject({ deleted_in_canvas: false, notes: "study chapters 1-4" });
  });

  it("does not mark anything deleted when the Canvas fetch fails", async () => {
    await runSync();
    world.failures.set(COURSE_1, new Error("Canvas request failed with status 500"));

    const result = await runSync();

    expect(result.status).toBe("error");
    expect(await assignmentRow(PROBLEM_SET)).toMatchObject({ deleted_in_canvas: false });
    expect(await assignmentRow(MIDTERM)).toMatchObject({ deleted_in_canvas: false });
  });

  it("records token_expired and stops when Canvas answers 401", async () => {
    world.failures.set(COURSE_1, new CanvasAuthError());
    world.failures.set(COURSE_2, new CanvasAuthError());

    const result = await runSync();

    expect(result.status).toBe("token_expired");
    const { data: run } = await db.from("sync_runs").select("*").eq("id", result.runId).single();
    expect(run).toMatchObject({ status: "token_expired" });
    expect(run?.error_message).toMatch(/token/i);
    expect(run?.finished_at).not.toBeNull();
  });

  it("keeps syncing other courses when one fails, and names the failed course", async () => {
    world.failures.set(COURSE_2, new Error("Canvas request failed with status 500"));

    const result = await runSync();

    expect(result.status).toBe("error");
    expect(result.error).toContain("TEST 2000");
    expect(await assignmentRow(PROBLEM_SET)).toMatchObject({ course_id: courseIds.first });
  });

  describe("only one sync runs at a time", () => {
    const startRun = async (startedAt?: string) =>
      check(
        await db
          .from("sync_runs")
          .insert({ source: "canvas", status: "running", owner_id: OWNER, ...(startedAt && { started_at: startedAt }) }),
      );

    it("skips, and writes nothing, while another sync is running", async () => {
      await startRun();

      const outcome = await attemptSync();

      expect(outcome).toEqual({ status: "skipped", reason: "another sync is already running" });
      const { count: assignments } = await db
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", OWNER);
      const { count: runs } = await db
        .from("sync_runs")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", OWNER);
      expect(assignments).toBe(0);
      expect(runs).toBe(1); // just the pretend running one; the skipped attempt left no row
    });

    it("closes a run that never finished and syncs anyway", async () => {
      const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await startRun(anHourAgo);

      const outcome = await attemptSync();

      expect(outcome.status).toBe("success");
      const { data: runs } = await db.from("sync_runs").select("status, finished_at, error_message").eq("owner_id", OWNER);
      expect(runs).toHaveLength(2);
      expect(runs).toContainEqual(expect.objectContaining({ status: "error", error_message: expect.stringMatching(/did not finish/) }));
      expect(runs?.every((run) => run.finished_at !== null)).toBe(true);
    });

    it("lets exactly one of two simultaneous syncs through", async () => {
      const outcomes = await Promise.all([attemptSync(), attemptSync()]);

      expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(["skipped", "success"]);
      const { count } = await db.from("assignments").select("id", { count: "exact", head: true }).eq("owner_id", OWNER);
      expect(count).toBe(2);
    });

    it("allows the next sync once the previous one has finished", async () => {
      await runSync();
      expect((await attemptSync()).status).toBe("success");
    });
  });

  it("refuses to write into a course that belongs to someone else", async () => {
    const { error } = await db.rpc("sync_assignments", {
      p_owner: OTHER_OWNER,
      p_course_id: courseIds.first,
      p_rows: [],
    });

    expect(error?.message).toMatch(/does not belong to this owner/);
  });

  it("cannot be called with the public anon key", async () => {
    const anon = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.anonKey ?? "unused", {
      auth: { persistSession: false },
    });

    const { error } = await anon.rpc("sync_assignments", {
      p_owner: OWNER,
      p_course_id: courseIds.first,
      p_rows: [],
    });

    expect(error).not.toBeNull();
    expect(await db.from("assignments").select("id", { count: "exact", head: true }).eq("owner_id", OWNER)).toMatchObject({ count: 0 });
  });
});
