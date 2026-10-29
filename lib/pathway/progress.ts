import type { TermSummary } from "@/lib/pathway/summarize";

// The degree at a glance, for the line above the pathway board: credits by status, the term the
// plan finishes in and how many terms with courses are still to come (this one included).
// Co-op placements aren't coursework, so they count towards neither.

export type PlanProgress = {
  done: number;
  inProgress: number;
  planned: number;
  total: number;
  finalTerm: string | null;
  termsLeft: number;
};

export function planProgress(terms: readonly TermSummary[]): PlanProgress {
  const coursework = terms.map((term) => ({ term, courses: term.courses.filter((course) => !course.type.coop) }));
  const credits = (status: string) =>
    coursework.reduce(
      (sum, { courses }) => sum + courses.filter((course) => course.status === status).reduce((total, course) => total + course.credits, 0),
      0,
    );
  const done = credits("done");
  const inProgress = credits("in_progress");
  const planned = credits("planned");
  const withCourses = coursework.filter(({ courses }) => courses.length > 0);

  return {
    done,
    inProgress,
    planned,
    total: done + inProgress + planned,
    finalTerm: withCourses.at(-1)?.term.name ?? null,
    termsLeft: withCourses.filter(({ courses }) => courses.some((course) => course.status !== "done")).length,
  };
}
