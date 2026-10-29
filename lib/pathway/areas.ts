import type { CourseStatus } from "@/lib/pathway/labels";
import type { AreaInfo } from "@/lib/setup/setup";

// What every progress ring draws: how many items are done, in progress, or neither.
export type RingCounts = { done: number; inProgress: number; notStarted: number; total: number };
export type AreaSummary = RingCounts & { area: AreaInfo };

export type AreaCourse = { id: string; status: CourseStatus };
export type AreaRequirement = { areaId: string; courses: AreaCourse[] };

// Counts the courses that fill each area's requirements, by status, in the order of `areas`.
// Each course is its own slice, so a lecture and its lab count separately even when one
// requirement bundles them. A course linked to several requirements in the same area is counted
// once. Areas with no courses are left out.
export function summarizeAreas(areas: AreaInfo[], requirements: AreaRequirement[]): AreaSummary[] {
  return areas
    .map((area) => {
      const courses = new Map<string, AreaCourse>();
      for (const requirement of requirements) {
        if (requirement.areaId !== area.id) continue;
        for (const course of requirement.courses) courses.set(course.id, course);
      }
      const all = [...courses.values()];
      const done = all.filter((course) => course.status === "done").length;
      const inProgress = all.filter((course) => course.status === "in_progress").length;
      return { area, done, inProgress, notStarted: all.length - done - inProgress, total: all.length };
    })
    .filter((summary) => summary.total > 0);
}

/** What's left, briefly: "1 in progress · 2 to go", or "Complete". The ring's centre shows what's done. */
export function ringCaption({ inProgress, notStarted, total, done }: RingCounts): string {
  if (total > 0 && done === total) return "Complete";
  return [inProgress > 0 && `${inProgress} in progress`, notStarted > 0 && `${notStarted} to go`].filter(Boolean).join(" · ");
}
