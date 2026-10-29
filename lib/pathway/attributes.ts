import type { RingCounts } from "@/lib/pathway/areas";
import type { CourseStatus } from "@/lib/pathway/labels";
import type { AttributeInfo } from "@/lib/setup/setup";

// Course attributes are tags a degree asks you to collect, such as Northeastern's NUpath codes.
export type AttributeCourse = { attributeIds: string[]; status: CourseStatus };
export type AttributeSummary = RingCounts & { codes: { code: string; state: CourseStatus }[] };

const RANK: Record<CourseStatus, number> = { planned: 0, in_progress: 1, done: 2 };

// Only required attributes count. One is covered once a completed course carries it, in
// progress if only an in-progress course does, and not started otherwise (planned courses do
// not count).
export function summarizeAttributes(attributes: AttributeInfo[], courses: AttributeCourse[]): AttributeSummary {
  const codes = attributes
    .filter((attribute) => attribute.required)
    .map((attribute) => {
      const best = courses
        .filter((course) => course.attributeIds.includes(attribute.id))
        .reduce<CourseStatus>((state, course) => (RANK[course.status] > RANK[state] ? course.status : state), "planned");
      return { code: attribute.code, state: best };
    });
  const done = codes.filter((entry) => entry.state === "done").length;
  const inProgress = codes.filter((entry) => entry.state === "in_progress").length;
  return { codes, done, inProgress, notStarted: codes.length - done - inProgress, total: codes.length };
}
