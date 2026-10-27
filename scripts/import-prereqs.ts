import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { PREREQS, type PrereqEntry } from "./prereqs";

type PrereqInsert = Database["public"]["Tables"]["course_prereqs"]["Insert"];

/**
 * Turns the catalogue list into rows: one per (course, kind, group, required code), groups
 * numbered from 1. Courses not in the plan are returned separately so the import can say so.
 */
export function toPrereqRows(
  entries: readonly PrereqEntry[],
  courseIds: ReadonlyMap<string, string>,
  ownerId: string,
): { rows: PrereqInsert[]; missing: string[] } {
  const rows: PrereqInsert[] = [];
  const missing: string[] = [];
  for (const entry of entries) {
    const courseId = courseIds.get(entry.course);
    if (!courseId) {
      missing.push(entry.course);
      continue;
    }
    for (const kind of ["prereq", "coreq"] as const) {
      (entry[kind] ?? []).forEach((group, index) => {
        for (const code of group) {
          rows.push({ course_id: courseId, requires_code: code, kind, option_group: index + 1, owner_id: ownerId });
        }
      });
    }
  }
  return { rows, missing };
}

/**
 * Replaces the prerequisites of every course in the list, so re-running after an edit to
 * scripts/prereqs.ts leaves exactly what the list says. The service role bypasses RLS, so the
 * owner is set explicitly.
 */
export async function seedPrereqs(supabase: SupabaseClient<Database>, ownerId: string) {
  const { data: courses, error } = await supabase.from("courses").select("id, code").eq("owner_id", ownerId);
  if (error) throw new Error(`Reading courses failed: ${error.message}`);
  const courseIds = new Map(courses.map((course) => [course.code, course.id]));

  const { rows, missing } = toPrereqRows(PREREQS, courseIds, ownerId);
  const listed = PREREQS.map((entry) => courseIds.get(entry.course)).filter((id): id is string => Boolean(id));

  const { error: deleteError } = await supabase.from("course_prereqs").delete().eq("owner_id", ownerId).in("course_id", listed);
  if (deleteError) throw new Error(`Clearing old prerequisites failed: ${deleteError.message}`);
  const { error: insertError } = await supabase.from("course_prereqs").insert(rows);
  if (insertError) throw new Error(`Inserting prerequisites failed: ${insertError.message}`);

  return { rows: rows.length, courses: listed.length, missing };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

async function main() {
  const supabase = createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const result = await seedPrereqs(supabase, requireEnv("OWNER_ID"));
  console.log(`Seeded ${result.rows} prerequisite rows for ${result.courses} courses`);
  if (result.missing.length > 0) console.log(`Not in the plan, skipped: ${result.missing.join(", ")}`);
}

// Run only when executed directly, so tests can import toPrereqRows without side effects.
if (process.argv[1]?.endsWith("import-prereqs.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
