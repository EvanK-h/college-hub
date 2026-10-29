import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { E2E_EMAIL, E2E_USER_ID, localSupabase } from "./local";

// Invented data for the end-to-end user, rebuilt from scratch before each spec file so every
// test starts from the same plan. Ids and Canvas ids are chosen so they can't collide with
// anything real or with the Vitest database tests.
//
//   Test transfer credit (900)  QA 1000 done
//   Test Fall 2026 (901)        QA 2000 in progress, on Canvas, with a graded problem set and an exam to come
//   Test Spring 2027 (902)      QA 2100 planned, needs QA 2000
//   Test Fall 2027 (903)        QA 3000 planned, needs QA 2100; QA 3100 planned
//   Test co-op (904)
//   Swap option: QA 4000 · Invented Elective, in place of QA 3100

export const TERMS = { transfer: 900, fall26: 901, spring27: 902, fall27: 903, coop: 904 } as const;
// Term names are unique across every owner, so the test terms are named so no real term can clash.
export const TERM_NAMES = {
  transfer: "Test transfer credit",
  fall26: "Test Fall 2026",
  spring27: "Test Spring 2027",
  fall27: "Test Fall 2027",
  coop: "Test co-op",
} as const;
const OWNED_TABLES = ["plans", "todos", "swap_options", "courses", "sync_runs"] as const;

function admin() {
  const { url, serviceKey } = localSupabase();
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false } });
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> | null {
  if (error) throw new Error(`Seeding the e2e user failed: ${error.message}`);
  return data ?? null;
}

/** Like check, for queries whose rows the seed goes on to use. */
function rows<T>(result: { data: T[] | null; error: { message: string } | null }): T[] {
  return check(result) ?? [];
}

/** Creates the e2e user if it doesn't exist. Sign-ups are off, so the magic link needs it there. */
export async function ensureUser() {
  const db = admin();
  const { data } = await db.auth.admin.getUserById(E2E_USER_ID);
  if (data.user) return;
  const { error } = await db.auth.admin.createUser({ id: E2E_USER_ID, email: E2E_EMAIL, email_confirm: true });
  if (error) throw new Error(`Creating the e2e user failed: ${error.message}`);
}

export async function seed() {
  const db = admin();
  await ensureUser();
  const owner = E2E_USER_ID;

  // Child rows (assignments, prerequisites, plan rows...) go with their courses and plans.
  for (const table of OWNED_TABLES) check(await db.from(table).delete().eq("owner_id", owner));
  check(await db.from("terms").delete().eq("owner_id", owner));

  check(
    await db.from("terms").insert([
      { id: TERMS.transfer, name: TERM_NAMES.transfer, kind: "transfer", time_zone: "America/New_York", owner_id: owner },
      { id: TERMS.fall26, name: TERM_NAMES.fall26, kind: "semester", time_zone: "Europe/London", owner_id: owner },
      { id: TERMS.spring27, name: TERM_NAMES.spring27, kind: "semester", time_zone: "Europe/London", owner_id: owner },
      { id: TERMS.fall27, name: TERM_NAMES.fall27, kind: "semester", time_zone: "America/New_York", owner_id: owner },
      { id: TERMS.coop, name: TERM_NAMES.coop, kind: "coop", time_zone: "America/New_York", owner_id: owner },
    ]),
  );

  // A multi-row insert fills missing keys with null, so every row names every column.
  const course = (code: string, title: string, term_id: number, status: "planned" | "in_progress" | "done", canvas_course_id: number | null = null) => ({
    code, title, credits: 4, type: "cs_core" as const, term_id, status, canvas_course_id, owner_id: owner,
  });
  const courses = rows(
    await db
      .from("courses")
      .insert([
        course("QA 1000", "Foundations of Testing", TERMS.transfer, "done"),
        course("QA 2000", "Browser Automation", TERMS.fall26, "in_progress", 9_900_001),
        course("QA 2100", "Flaky Test Forensics", TERMS.spring27, "planned"),
        course("QA 3000", "Advanced Assertions", TERMS.fall27, "planned"),
        course("QA 3100", "Test Doubles", TERMS.fall27, "planned"),
      ])
      .select("id, code"),
  );
  const id = (code: string) => courses.find((c) => c.code === code)?.id ?? "";

  check(
    await db.from("course_prereqs").insert([
      { course_id: id("QA 2100"), requires_code: "QA 2000", kind: "prereq", option_group: 1, owner_id: owner },
      { course_id: id("QA 3000"), requires_code: "QA 2100", kind: "prereq", option_group: 1, owner_id: owner },
    ]),
  );

  // QA 2000's grade: problem sets (60%) 80/100 graded, the exam (40%) still to come. So the course
  // stands at 80%, an A- (90%) is out of reach (88% at best), and a B- (80%) needs 80% on the exam.
  check(
    await db.from("assignment_groups").insert([
      { canvas_id: 9_900_101, course_id: id("QA 2000"), name: "Problem sets", weight: 60, position: 1, owner_id: owner },
      { canvas_id: 9_900_102, course_id: id("QA 2000"), name: "Exam", weight: 40, position: 2, owner_id: owner },
    ]),
  );
  const soon = new Date(Date.now() + 5 * 86_400_000).toISOString();
  check(
    await db.from("assignments").insert([
      {
        canvas_id: 9_900_201, course_id: id("QA 2000"), assignment_group_id: 9_900_101, title: "Problem Set 1", kind: "assignment",
        due_at: new Date(Date.now() - 7 * 86_400_000).toISOString(), points_possible: 100, html_url: "https://canvas.example.test/a/1",
        workflow_state: "graded", score: 80, owner_id: owner,
      },
      {
        canvas_id: 9_900_202, course_id: id("QA 2000"), assignment_group_id: 9_900_102, title: "Final Exam", kind: "exam",
        due_at: soon, points_possible: 100, html_url: "https://canvas.example.test/a/2", workflow_state: "unsubmitted", score: null, owner_id: owner,
      },
    ]),
  );

  const [swap] = rows(
    await db
      .from("swap_options")
      .insert({ swap_in: "QA 4000 · Invented Elective", slot: "khoury_elective", quantum_relevance: "medium", ai_relevance: "high", owner_id: owner })
      .select("id"),
  );
  check(await db.from("swap_replaces").insert({ swap_option_id: swap?.id ?? "", course_id: id("QA 3100"), owner_id: owner }));

  // A fresh successful sync, so loading the dashboard never starts one.
  const now = new Date().toISOString();
  check(
    await db.from("sync_runs").insert([
      { source: "canvas", status: "success", started_at: now, finished_at: now, owner_id: owner },
      { source: "timetable", status: "success", started_at: now, finished_at: now, owner_id: owner },
    ]),
  );
}
