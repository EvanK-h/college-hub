// The per-user setup the app reads instead of hard-coding one school: the profile (grade scale,
// credit limits, credit unit), course types, requirement areas, swap slots, attributes (such as
// NUpath) and focuses. Loaded by lib/setup/load.ts; see the 2026-10-29 decision.
import { z } from "zod";
import type { TermKind } from "@/lib/pathway/move-checks";

// Sets `--course` to a palette colour (1–6, --category-N in globals.css), so a card's bar, its
// faint tint and a legend dot all read one variable. Tailwind only generates classes it can find
// as whole strings, so each is spelled out. Anything out of range gets the neutral grey (5).
const CATEGORY_CLASSES = [
  "[--course:var(--category-1)]",
  "[--course:var(--category-2)]",
  "[--course:var(--category-3)]",
  "[--course:var(--category-4)]",
  "[--course:var(--category-5)]",
  "[--course:var(--category-6)]",
] as const;

export const CATEGORY_COLOR_COUNT = CATEGORY_CLASSES.length;

export function categoryClass(color: number): string {
  return CATEGORY_CLASSES[color - 1] ?? CATEGORY_CLASSES[4];
}

export type CourseTypeInfo = { id: string; name: string; color: number; coop: boolean };
export type AreaInfo = { id: string; name: string; headline: boolean };
export type SlotInfo = { id: string; name: string };
export type AttributeInfo = { id: string; code: string; name: string; required: boolean };
export type FocusInfo = { id: string; name: string; goalCode: string | null };

const gradeScaleSchema = z
  .array(z.tuple([z.number().min(0).max(100), z.string().min(1).max(3)]))
  .min(1)
  .refine((scale) => scale.every(([minimum], index) => index === 0 || minimum < (scale[index - 1]?.[0] ?? Infinity)), "best letter first");

const creditLimitsSchema = z.partialRecord(z.enum(["transfer", "semester", "summer", "coop"]), z.number().positive());

export type GradeScale = z.infer<typeof gradeScaleSchema>;

export type Profile = {
  school: string | null;
  creditUnit: string;
  /** The name of the attribute set ("NUpath"), or null to hide the attribute ring. */
  attributeSetName: string | null;
  gradeScale: GradeScale;
  creditLimits: Partial<Record<TermKind, number>>;
};

/** The common US letter scale, used until a profile says otherwise. */
export const DEFAULT_GRADE_SCALE: GradeScale = [
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

export const DEFAULT_PROFILE: Profile = {
  school: null,
  creditUnit: "credits",
  attributeSetName: null,
  gradeScale: DEFAULT_GRADE_SCALE,
  creditLimits: {},
};

type ProfileRow = { school: string | null; credit_unit: string; attribute_set_name: string | null; grade_scale: unknown; credit_limits: unknown };

/** A profile row as the app uses it; malformed JSON falls back to the defaults rather than failing. */
export function toProfile(row: ProfileRow | null): Profile {
  if (!row) return DEFAULT_PROFILE;
  const scale = gradeScaleSchema.safeParse(row.grade_scale);
  const limits = creditLimitsSchema.safeParse(row.credit_limits);
  return {
    school: row.school,
    creditUnit: row.credit_unit,
    attributeSetName: row.attribute_set_name,
    gradeScale: scale.success ? scale.data : DEFAULT_GRADE_SCALE,
    creditLimits: limits.success ? limits.data : {},
  };
}
