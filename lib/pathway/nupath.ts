import type { Database } from "@/lib/database.types";
import type { RingCounts } from "@/lib/pathway/areas";
import type { CourseStatus } from "@/lib/pathway/labels";

export type NupathCode = Database["public"]["Enums"]["nupath"];

// Every code the schema knows is treated as required. Remove a code here if the degree needs fewer.
export const REQUIRED_NUPATH: NupathCode[] = ["ND", "EI", "IC", "FQ", "SI", "AD", "DD", "ER", "WF", "WD", "WI", "EX", "CE"];

export type NupathCourse = { nupath: NupathCode[]; status: CourseStatus };
export type NupathSummary = RingCounts & { codes: { code: NupathCode; state: CourseStatus }[] };

const RANK: Record<CourseStatus, number> = { planned: 0, in_progress: 1, done: 2 };

// A code is covered once a completed course carries it, in progress if only an in-progress
// course does, and not started otherwise (planned courses do not count).
export function summarizeNupath(courses: NupathCourse[]): NupathSummary {
  const codes = REQUIRED_NUPATH.map((code) => {
    const best = courses
      .filter((course) => course.nupath.includes(code))
      .reduce<CourseStatus>((state, course) => (RANK[course.status] > RANK[state] ? course.status : state), "planned");
    return { code, state: best };
  });
  const done = codes.filter((entry) => entry.state === "done").length;
  const inProgress = codes.filter((entry) => entry.state === "in_progress").length;
  return { codes, done, inProgress, notStarted: codes.length - done - inProgress, total: codes.length };
}
