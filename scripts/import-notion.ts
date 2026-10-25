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

const REQUIREMENT_AREAS = {
  "CS overview": "cs_overview",
  "CS fundamentals": "cs_fundamentals",
  "CS required": "cs_required",
  "Security and presentation": "security_presentation",
  "Khoury electives": "khoury_electives",
  "Supporting courses": "supporting",
  Writing: "writing",
  "AI concentration": "ai_concentration",
  "Physics minor": "physics_minor",
  Universitywide: "universitywide",
} as const;

const SWAP_SLOTS = [
  "london_elective",
  "khoury_elective",
  "ai_elective",
  "software_engineering",
  "placement_substitute",
  "physics_minor_elective",
  "advanced_writing",
] as const;

const QUANTUM_RELEVANCE = ["none", "lower", "low", "medium", "high"] as const;

// "Physics minor elective" -> "physics_minor_elective", checked against the enum values.
const enumLabel = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((label) => label.toLowerCase().replaceAll(" ", "_"))
    .pipe(z.enum(values));

const optionalText = z.string().transform((text) => text || null);

// Notion exports a relation as "CS 3100 (https://app.notion.com/...), CS 3101 (...)".
// Drop each URL, then what is left is a comma-separated list of course codes.
export function extractCourseCodes(cell: string): string[] {
  return cell
    .replace(/\s*\(https?:\/\/[^)]*\)/g, "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

const courseCodes = z.string().transform(extractCourseCodes);

const requirementRowSchema = z
  .object({
    Requirement: z.string().min(1),
    Area: z.enum(Object.keys(REQUIREMENT_AREAS) as [keyof typeof REQUIREMENT_AREAS]),
    Options: optionalText,
    Notes: optionalText,
    Courses: courseCodes,
  })
  .transform((row) => ({
    name: row.Requirement,
    area: REQUIREMENT_AREAS[row.Area],
    options: row.Options,
    notes: row.Notes,
    courseCodes: row.Courses,
  }));

const swapRowSchema = z
  .object({
    "Swap in": z.string().min(1),
    Slot: enumLabel(SWAP_SLOTS),
    "Fits in": optionalText,
    Prerequisites: optionalText,
    "Quantum relevance": enumLabel(QUANTUM_RELEVANCE),
    "Why consider it": optionalText,
    "Why the current pick is better": optionalText,
    Replaces: courseCodes,
  })
  .transform((row) => ({
    swap_in: row["Swap in"],
    slot: row.Slot,
    fits_in: row["Fits in"],
    prerequisites: row.Prerequisites,
    quantum_relevance: row["Quantum relevance"],
    why_consider: row["Why consider it"],
    why_current_better: row["Why the current pick is better"],
    courseCodes: row.Replaces,
  }));

export type ParsedRequirement = z.output<typeof requirementRowSchema>;
export type ParsedSwap = z.output<typeof swapRowSchema>;

function parseCsv<T>(csvText: string, schema: z.ZodType<T>): T[] {
  const records: unknown[] = parse(csvText, { columns: true, bom: true, skip_empty_lines: true });
  return records.map((record) => schema.parse(record));
}

export const parseRequirements = (csvText: string) => parseCsv(csvText, requirementRowSchema);
export const parseSwaps = (csvText: string) => parseCsv(csvText, swapRowSchema);

async function loadCourseIds(supabase: SupabaseClient<Database>, ownerId: string) {
  const { data, error } = await supabase.from("courses").select("id, code").eq("owner_id", ownerId);
  if (error) throw new Error(`Reading courses failed: ${error.message}`);
  return new Map(data.map((course) => [course.code, course.id]));
}

// An unknown code throws, so a typo in the export can't silently drop a link.
function resolveCourseIds(codes: string[], courseIds: Map<string, string>, owner: string): string[] {
  return codes.map((code) => {
    const id = courseIds.get(code);
    if (id === undefined) throw new Error(`${owner}: unknown course "${code}"`);
    return id;
  });
}

export async function seedRequirements(supabase: SupabaseClient<Database>, ownerId: string, csvText: string) {
  const parsed = parseRequirements(csvText);
  const courseIds = await loadCourseIds(supabase, ownerId);

  const rows = parsed.map((requirement) => ({
    name: requirement.name,
    area: requirement.area,
    options: requirement.options,
    notes: requirement.notes,
    owner_id: ownerId,
  }));
  const { data: saved, error } = await supabase
    .from("requirements")
    .upsert(rows, { onConflict: "owner_id,name" })
    .select("id, name");
  if (error) throw new Error(`Seeding requirements failed: ${error.message}`);
  const requirementIds = new Map(saved.map((requirement) => [requirement.name, requirement.id]));

  const links = parsed.flatMap((requirement) =>
    resolveCourseIds(requirement.courseCodes, courseIds, requirement.name).map((courseId) => ({
      course_id: courseId,
      requirement_id: requirementIds.get(requirement.name)!,
      owner_id: ownerId,
    })),
  );
  const { error: linkError } = await supabase
    .from("course_requirements")
    .upsert(links, { onConflict: "course_id,requirement_id" });
  if (linkError) throw new Error(`Seeding course_requirements failed: ${linkError.message}`);
  return { requirements: rows.length, links: links.length };
}

export async function seedSwaps(supabase: SupabaseClient<Database>, ownerId: string, csvText: string) {
  const parsed = parseSwaps(csvText);
  const courseIds = await loadCourseIds(supabase, ownerId);

  const rows = parsed.map((swap) => ({
    swap_in: swap.swap_in,
    slot: swap.slot,
    fits_in: swap.fits_in,
    prerequisites: swap.prerequisites,
    quantum_relevance: swap.quantum_relevance,
    why_consider: swap.why_consider,
    why_current_better: swap.why_current_better,
    owner_id: ownerId,
  }));
  const { data: saved, error } = await supabase
    .from("swap_options")
    .upsert(rows, { onConflict: "owner_id,swap_in,slot" })
    .select("id, swap_in, slot");
  if (error) throw new Error(`Seeding swap_options failed: ${error.message}`);
  // The same course can be a swap for two slots, so the key is swap_in + slot.
  const swapIds = new Map(saved.map((swap) => [`${swap.swap_in}|${swap.slot}`, swap.id]));

  const links = parsed.flatMap((swap) =>
    resolveCourseIds(swap.courseCodes, courseIds, swap.swap_in).map((courseId) => ({
      swap_option_id: swapIds.get(`${swap.swap_in}|${swap.slot}`)!,
      course_id: courseId,
      owner_id: ownerId,
    })),
  );
  const { error: linkError } = await supabase
    .from("swap_replaces")
    .upsert(links, { onConflict: "swap_option_id,course_id" });
  if (linkError) throw new Error(`Seeding swap_replaces failed: ${linkError.message}`);
  return { swaps: rows.length, links: links.length };
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
  const ownerId = requireEnv("OWNER_ID");
  console.log(`Seeded ${await seedCourses(supabase, ownerId, coursesCsv)} courses`);

  const requirementsCsv = readFileSync("scripts/data/requirements.csv", "utf-8");
  const requirements = await seedRequirements(supabase, ownerId, requirementsCsv);
  console.log(`Seeded ${requirements.requirements} requirements, ${requirements.links} course links`);

  const swapsCsv = readFileSync("scripts/data/swap-options.csv", "utf-8");
  const swaps = await seedSwaps(supabase, ownerId, swapsCsv);
  console.log(`Seeded ${swaps.swaps} swap options, ${swaps.links} replaced-course links`);
}

// Run only when executed directly, so tests can import seedTerms without side effects.
if (process.argv[1]?.endsWith("import-notion.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
