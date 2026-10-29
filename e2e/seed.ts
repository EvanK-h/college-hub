import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { readFolder } from "../scripts/data-folder/files";
import { writeDataset } from "../scripts/data-folder/write";
import { E2E_EMAIL, E2E_USER_ID, localSupabase } from "./local";

// Invented data for the end-to-end user, rebuilt from scratch before each spec file so every
// test starts from the same plan. The plan is the data folder in e2e/data, loaded by the same
// importer as everyone's own data; this file adds what a sync would (Canvas grades, sync runs).
// Ids and Canvas ids are chosen so they can't collide with anything real or with the Vitest
// database tests.
//
//   Transfer credit (900)  QA 1000 done
//   Fall 2026 (901)        QA 2000 in progress, on Canvas, with a graded problem set and an exam to come
//   Spring 2027 (902)      QA 2100 planned, needs QA 2000
//   Fall 2027 (903)        QA 3000 planned, needs QA 2100; QA 3100 planned
//   Co-op (904)
//   Swap option: QA 4000 · Invented Elective, in place of QA 3100

const FIRST_TERM_ID = 900;
export const TERM_NAMES = {
  transfer: "Transfer credit",
  fall26: "Fall 2026",
  spring27: "Spring 2027",
  fall27: "Fall 2027",
  coop: "Co-op",
} as const;
// Deleted in this order: rows that point at categories go before the categories themselves.
const OWNED_TABLES = [
  "plans",
  "todos",
  "swap_options",
  "requirements",
  "courses",
  "sync_runs",
  "course_types",
  "requirement_areas",
  "swap_slots",
  "attributes",
  "focuses",
  "profiles",
  "terms",
] as const;

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
  await writeDataset(db, owner, readFolder("e2e/data"), { firstTermId: FIRST_TERM_ID });

  const courses = rows(await db.from("courses").select("id, code").eq("owner_id", owner));
  const id = (code: string) => courses.find((c) => c.code === code)?.id ?? "";

  // QA 2000 is on Canvas, as if mapped in Settings.
  check(await db.from("courses").update({ canvas_course_id: 9_900_001 }).eq("id", id("QA 2000")));

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

  // A fresh successful sync, so loading the dashboard never starts one.
  const now = new Date().toISOString();
  check(
    await db.from("sync_runs").insert([
      { source: "canvas", status: "success", started_at: now, finished_at: now, owner_id: owner },
      { source: "timetable", status: "success", started_at: now, finished_at: now, owner_id: owner },
    ]),
  );
}
