// The data folder: one student's degree plan as JSON files, checked here before anything is
// written. `npm run import -- data/<name>` loads it (scripts/import.ts); the format is described
// in the README and data/example/ is a complete, invented example.
//
//   profile.json       school, credit unit, grade scale, credit limits and the categories:
//                      course types, requirement areas, swap slots, attributes, focuses
//   terms.json         terms in order, first to last
//   courses.json       every course, with its type, status and term
//   requirements.json  (optional) degree requirements and the courses that fill them
//   swaps.json         (optional) courses you could take instead of planned ones
//   prereqs.json       (optional) prerequisites, added to (and overriding) the preset's
//
// Categories are referred to by name, terms by name and courses by code, so the files read like
// a spreadsheet. Pure functions only: reading files and writing rows live elsewhere.
import { z } from "zod";
import { NORTHEASTERN } from "./northeastern";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = z.string().trim().min(1).nullish().transform((value) => value ?? null);
// Codes are matched exactly, so "CS 2500" and "CS2500" are different courses. Anything short goes
// ("Co-op 1"); a focus's goal must be a real catalogue code, as the database checks.
const courseCode = text(20);
const goalCode = z.string().trim().regex(/^[A-Z]{2,4} \d{4}$/, "a course code like PHYS 5352");
const termKind = z.enum(["transfer", "semester", "summer", "coop"]);
const relevance = z.enum(["none", "lower", "low", "medium", "high"]);
const isoDate = z.iso.date().nullish().transform((value) => value ?? null);

const gradeScale = z
  .array(z.tuple([z.number().min(0).max(100), text(3)]))
  .min(1)
  .refine((scale) => scale.every(([minimum], index) => index === 0 || minimum < (scale[index - 1]?.[0] ?? Infinity)), "list letters best first");

const profileSchema = z.object({
  preset: z.enum(["northeastern"]).nullish().transform((value) => value ?? null),
  school: optionalText,
  creditUnit: text(12).optional(),
  /** Terms without their own time zone use this one. */
  timeZone: text(64).optional(),
  attributeSetName: optionalText.optional(),
  gradeScale: gradeScale.optional(),
  creditLimits: z.partialRecord(termKind, z.number().positive()).optional(),
  courseTypes: z
    .array(z.object({ name: text(40), color: z.number().int().min(1).max(6), coop: z.boolean().default(false) }))
    .min(1, "add at least one course type"),
  areas: z.array(z.object({ name: text(60), headline: z.boolean().default(false) })).default([]),
  slots: z.array(text(60)).default([]),
  attributes: z.array(z.object({ code: text(12), name: text(120), required: z.boolean().default(true) })).optional(),
  focuses: z.array(z.object({ name: text(30), goal: goalCode.nullish().transform((value) => value ?? null) })).default([]),
});

const termsSchema = z
  .array(
    z.object({
      name: text(60),
      kind: termKind,
      campus: optionalText,
      timeZone: text(64).optional(),
      startsOn: isoDate,
      endsOn: isoDate,
    }),
  )
  .min(1, "add at least one term");

const coursesSchema = z.array(
  z.object({
    code: courseCode,
    title: text(200),
    credits: z.number().nonnegative(),
    type: text(40),
    status: z.enum(["planned", "in_progress", "done"]).default("planned"),
    term: text(60),
    attributes: z.array(text(12)).default([]),
    notes: optionalText,
  }),
);

const requirementsSchema = z.array(
  z.object({
    name: text(200),
    area: text(60),
    options: optionalText,
    notes: optionalText,
    courses: z.array(courseCode).default([]),
  }),
);

const swapsSchema = z.array(
  z.object({
    swapIn: text(200),
    slot: text(60),
    fitsIn: optionalText,
    prerequisites: optionalText,
    whyConsider: optionalText,
    whyCurrentBetter: optionalText,
    replaces: z.array(courseCode).default([]),
    /** Focus name → how well the swap fits it; a focus left out counts as none. */
    relevance: z.record(z.string(), relevance).default({}),
  }),
);

const codeGroups = z.array(z.array(z.string().trim().min(1)).min(1)).optional();
export const prereqsSchema = z.array(
  z.object({
    course: courseCode,
    prereq: codeGroups,
    coreq: codeGroups,
    recommended: codeGroups,
    review: z.string().optional(),
  }),
);

export type PrereqEntry = z.output<typeof prereqsSchema>[number];

export const FOLDER_FILES = {
  profile: { file: "profile.json", schema: profileSchema, required: true },
  terms: { file: "terms.json", schema: termsSchema, required: true },
  courses: { file: "courses.json", schema: coursesSchema, required: true },
  requirements: { file: "requirements.json", schema: requirementsSchema, required: false },
  swaps: { file: "swaps.json", schema: swapsSchema, required: false },
  prereqs: { file: "prereqs.json", schema: prereqsSchema, required: false },
} as const;

type Files = typeof FOLDER_FILES;

/** The folder as written, each file parsed. */
export type RawDataset = { [K in keyof Files]: z.output<Files[K]["schema"]> };

/** The folder with its preset applied and every default filled in, ready to write. */
export type Dataset = Omit<RawDataset, "profile"> & {
  profile: Omit<RawDataset["profile"], "creditUnit" | "timeZone" | "attributeSetName" | "gradeScale" | "creditLimits" | "attributes"> & {
    creditUnit: string;
    timeZone: string;
    attributeSetName: string | null;
    gradeScale: [number, string][];
    creditLimits: Partial<Record<z.infer<typeof termKind>, number>>;
    attributes: { code: string; name: string; required: boolean }[];
  };
};

/**
 * Parses each file's JSON (undefined for a missing optional file). Returns every problem at
 * once, each naming its file and path, so one run shows everything to fix.
 */
export function parseFolder(files: { [K in keyof Files]?: unknown }): { data: RawDataset } | { errors: string[] } {
  const errors: string[] = [];
  const data: Partial<Record<keyof Files, unknown>> = {};
  for (const [key, { file, schema, required }] of Object.entries(FOLDER_FILES) as [keyof Files, Files[keyof Files]][]) {
    const value = files[key];
    if (value === undefined) {
      if (required) errors.push(`${file}: missing`);
      else data[key] = [];
      continue;
    }
    const parsed = schema.safeParse(value);
    if (parsed.success) data[key] = parsed.data;
    else for (const issue of parsed.error.issues) errors.push(`${file}${formatPath(issue.path)}: ${issue.message}`);
  }
  return errors.length > 0 ? { errors } : { data: data as RawDataset };
}

function formatPath(path: PropertyKey[]): string {
  return path.length === 0 ? "" : ` at ${path.map((part) => (typeof part === "number" ? `[${part}]` : `.${String(part)}`)).join("")}`;
}

/**
 * Fills in what the profile leaves out, from its preset or the plain defaults. The Northeastern
 * preset brings NUpath, the university's grade scale, 18/9 SH term limits and catalogue
 * prerequisites; your own prereqs.json entry for a course replaces the catalogue's.
 */
export function applyPreset(raw: RawDataset): Dataset {
  const preset = raw.profile.preset === "northeastern" ? NORTHEASTERN : null;
  const { profile } = raw;
  const ownPrereqs = new Set(raw.prereqs.map((entry) => entry.course));
  return {
    ...raw,
    profile: {
      ...profile,
      school: profile.school ?? preset?.school ?? null,
      creditUnit: profile.creditUnit ?? preset?.creditUnit ?? "credits",
      timeZone: profile.timeZone ?? preset?.timeZone ?? "UTC",
      attributeSetName: profile.attributeSetName !== undefined ? profile.attributeSetName : (preset?.attributeSetName ?? null),
      gradeScale: profile.gradeScale ?? preset?.gradeScale ?? DEFAULT_SCALE,
      creditLimits: profile.creditLimits ?? preset?.creditLimits ?? {},
      attributes: profile.attributes ?? preset?.attributes ?? [],
    },
    prereqs: [...(preset?.prereqs ?? []).filter((entry) => !ownPrereqs.has(entry.course)), ...raw.prereqs],
  };
}

// The common US scale; matches the column default in the profiles table.
const DEFAULT_SCALE: [number, string][] = [
  [93, "A"],
  [90, "A−"],
  [87, "B+"],
  [83, "B"],
  [80, "B−"],
  [77, "C+"],
  [73, "C"],
  [70, "C−"],
  [67, "D+"],
  [63, "D"],
  [60, "D−"],
];

/**
 * Checks the files against each other: every type, area, slot, attribute, focus and term a row
 * names exists, and nothing is listed twice. Prerequisites may name courses outside the plan
 * (the requirement can be met by a transfer code, say), so they are not checked here.
 */
export function checkReferences(data: Dataset): string[] {
  const errors: string[] = [];
  const names = (values: readonly string[]) => new Set(values);
  const types = names(data.profile.courseTypes.map((type) => type.name));
  const areas = names(data.profile.areas.map((area) => area.name));
  const slots = names(data.profile.slots);
  const attributes = names(data.profile.attributes.map((attribute) => attribute.code));
  const focuses = names(data.profile.focuses.map((focus) => focus.name));
  const terms = names(data.terms.map((term) => term.name));
  const courses = names(data.courses.map((course) => course.code));

  const duplicates = (file: string, what: string, values: readonly string[]) => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) errors.push(`${file}: ${what} "${value}" is listed twice`);
      seen.add(value);
    }
  };
  duplicates("profile.json", "course type", data.profile.courseTypes.map((type) => type.name));
  duplicates("profile.json", "area", data.profile.areas.map((area) => area.name));
  duplicates("profile.json", "slot", data.profile.slots);
  duplicates("profile.json", "attribute", data.profile.attributes.map((attribute) => attribute.code));
  duplicates("profile.json", "focus", data.profile.focuses.map((focus) => focus.name));
  duplicates("terms.json", "term", data.terms.map((term) => term.name));
  duplicates("courses.json", "course", data.courses.map((course) => course.code));
  duplicates("requirements.json", "requirement", data.requirements.map((requirement) => requirement.name));
  duplicates("swaps.json", "swap", data.swaps.map((swap) => `${swap.swapIn}" in slot "${swap.slot}`));

  const known = (file: string, owner: string, what: string, value: string, set: Set<string>) => {
    if (!set.has(value)) errors.push(`${file}: ${owner} names ${what} "${value}", which isn't defined`);
  };
  for (const course of data.courses) {
    known("courses.json", course.code, "the type", course.type, types);
    known("courses.json", course.code, "the term", course.term, terms);
    for (const code of course.attributes) known("courses.json", course.code, "the attribute", code, attributes);
  }
  for (const requirement of data.requirements) {
    known("requirements.json", requirement.name, "the area", requirement.area, areas);
    for (const code of requirement.courses) known("requirements.json", requirement.name, "the course", code, courses);
  }
  for (const swap of data.swaps) {
    known("swaps.json", swap.swapIn, "the slot", swap.slot, slots);
    for (const code of swap.replaces) known("swaps.json", swap.swapIn, "the course", code, courses);
    for (const focus of Object.keys(swap.relevance)) known("swaps.json", swap.swapIn, "the focus", focus, focuses);
  }
  return errors;
}

/** Totals for the import's summary line and the import check test. */
export function totals(data: Dataset) {
  const credits = (list: readonly { credits: number }[]) => list.reduce((sum, course) => sum + course.credits, 0);
  const transferTerms = new Set(data.terms.filter((term) => term.kind === "transfer").map((term) => term.name));
  return {
    courses: data.courses.length,
    credits: credits(data.courses),
    transferCredits: credits(data.courses.filter((course) => transferTerms.has(course.term))),
    requirements: data.requirements.length,
    swaps: data.swaps.length,
  };
}
