import type { CourseStatus, ReqArea } from "@/lib/pathway/labels";

// What every progress ring draws: how many items are done, in progress, or neither.
export type RingCounts = { done: number; inProgress: number; notStarted: number; total: number };
export type AreaSummary = RingCounts & { area: ReqArea };

// The areas the spec names first get the top of the page; the rest follow in a fixed order.
export const HEADLINE_AREAS: ReqArea[] = ["cs_required", "ai_concentration", "physics_minor"];
const AREA_ORDER: ReqArea[] = [
  ...HEADLINE_AREAS,
  "cs_overview",
  "cs_fundamentals",
  "security_presentation",
  "khoury_electives",
  "supporting",
  "writing",
  "universitywide",
];

export type AreaCourse = { id: string; status: CourseStatus };
export type AreaRequirement = { area: ReqArea; courses: AreaCourse[] };

// Counts the courses that fill each area's requirements, by status. Each course is its own
// slice, so a lecture and its lab count separately even when one requirement bundles them.
// A course linked to several requirements in the same area is counted once.
// Areas with no courses are left out.
export function summarizeAreas(requirements: AreaRequirement[]): AreaSummary[] {
  return AREA_ORDER.map((area) => {
    const courses = new Map<string, AreaCourse>();
    for (const requirement of requirements) {
      if (requirement.area !== area) continue;
      for (const course of requirement.courses) courses.set(course.id, course);
    }
    const all = [...courses.values()];
    const done = all.filter((course) => course.status === "done").length;
    const inProgress = all.filter((course) => course.status === "in_progress").length;
    return { area, done, inProgress, notStarted: all.length - done - inProgress, total: all.length };
  }).filter((summary) => summary.total > 0);
}
