import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import type { Database } from "@/lib/database.types";

type TermInsert = Database["public"]["Tables"]["terms"]["Insert"];

// Chronological order; id is the sort order (0 = transfer credit).
// Dates stay null until the real calendars are published.
const TERMS: ReadonlyArray<Omit<TermInsert, "owner_id">> = [
  { id: 0, name: "Transfer credit", kind: "transfer", campus: null },
  { id: 1, name: "Fall 2026 · London", kind: "semester", campus: "london", time_zone: "Europe/London" },
  { id: 2, name: "Spring 2027 · London", kind: "semester", campus: "london", time_zone: "Europe/London" },
  { id: 3, name: "Fall 2027", kind: "semester", campus: "boston" },
  { id: 4, name: "Spring 2028", kind: "semester", campus: "boston" },
  { id: 5, name: "Summer 1 2028", kind: "summer", campus: "boston" },
  { id: 6, name: "Co-op 1 · Jul–Dec 2028", kind: "coop", campus: null },
  { id: 7, name: "Spring 2029", kind: "semester", campus: "boston" },
  { id: 8, name: "Summer 1 2029", kind: "summer", campus: "boston" },
  { id: 9, name: "Co-op 2 · Jul–Dec 2029", kind: "coop", campus: null },
  { id: 10, name: "Spring 2030", kind: "semester", campus: "boston" },
];

// Upsert on the unique `name`, so re-running updates rows instead of duplicating them.
// A service-role client bypasses RLS, so owner_id must be set explicitly.
export async function seedTerms(supabase: SupabaseClient<Database>, ownerId: string) {
  // A bulk upsert sends the union of all keys, so rows missing `time_zone` get null, not the column default.
  const rows = TERMS.map((term) => ({ time_zone: "America/New_York", ...term, owner_id: ownerId }));
  const { error } = await supabase.from("terms").upsert(rows, { onConflict: "name" });
  if (error) throw new Error(`Seeding terms failed: ${error.message}`);
}

const COURSE_TYPES = {
  "CS core": "cs_core",
  "AI concentration": "ai_concentration",
  "Physics minor": "physics_minor",
  "Major support": "major_support",
  "General elective": "general_elective",
  "Co-op / program": "coop_program",
} as const;

const COURSE_STATUSES = {
  Planned: "planned",
  "In progress": "in_progress",
  Done: "done",
} as const;

const NUPATH_CODES = ["ND", "EI", "IC", "FQ", "SI", "AD", "DD", "ER", "WF", "WD", "WI", "EX", "CE"] as const;

// Zod checks each CSV row before it reaches the database, so an unknown type or
// NUpath code fails here with a clear message instead of as a Postgres enum error.
const courseRowSchema = z
  .object({
    Course: z.string().min(1),
    Name: z.string().min(1),
    SH: z.coerce.number().nonnegative(),
    Type: z.enum(Object.keys(COURSE_TYPES) as [keyof typeof COURSE_TYPES]),
    Status: z.enum(Object.keys(COURSE_STATUSES) as [keyof typeof COURSE_STATUSES]),
    Term: z.string().min(1),
    NUpath: z.string().transform((value) =>
      value
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
    ),
    Notes: z.string(),
  })
  .transform((row) => ({
    code: row.Course,
    title: row.Name,
    credits: row.SH,
    type: COURSE_TYPES[row.Type],
    status: COURSE_STATUSES[row.Status],
    termName: row.Term,
    nupath: z.array(z.enum(NUPATH_CODES)).parse(row.NUpath),
    notes: row.Notes || null,
  }));

export type ParsedCourse = z.output<typeof courseRowSchema>;

// Pure: CSV text in, validated rows out. No database access, so tests can call it directly.
export function parseCourses(csvText: string): ParsedCourse[] {
  const records: unknown[] = parse(csvText, { columns: true, bom: true, skip_empty_lines: true });
  return records.map((record) => courseRowSchema.parse(record));
}

export async function seedCourses(supabase: SupabaseClient<Database>, ownerId: string, csvText: string) {
  const { data: terms, error: termsError } = await supabase.from("terms").select("id, name");
  if (termsError) throw new Error(`Reading terms failed: ${termsError.message}`);
  const termIds = new Map(terms.map((term) => [term.name, term.id]));

  const rows = parseCourses(csvText).map(({ termName, ...course }) => {
    const termId = termIds.get(termName);
    if (termId === undefined) throw new Error(`${course.code}: unknown term "${termName}"`);
    return { ...course, term_id: termId, owner_id: ownerId };
  });

  const { error } = await supabase.from("courses").upsert(rows, { onConflict: "owner_id,code" });
  if (error) throw new Error(`Seeding courses failed: ${error.message}`);
  return rows.length;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

async function main() {
  const supabase = createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
  await seedTerms(supabase, requireEnv("OWNER_ID"));
  console.log(`Seeded ${TERMS.length} terms`);

  const coursesCsv = readFileSync("scripts/data/courses.csv", "utf-8");
  console.log(`Seeded ${await seedCourses(supabase, requireEnv("OWNER_ID"), coursesCsv)} courses`);
}

// Run only when executed directly, so tests can import seedTerms without side effects.
if (process.argv[1]?.endsWith("import-notion.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
