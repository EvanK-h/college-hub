import type { Database } from "@/lib/database.types";
import type { CourseTypeInfo } from "@/lib/setup/setup";

type Term = Database["public"]["Tables"]["terms"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];

// Only the columns the pathway page shows, so tests can build inputs without every field. The
// course's type comes embedded from course_types (select `type:course_types(id, name, color, coop)`).
export type PathwayCourse = Pick<Course, "id" | "code" | "title" | "credits" | "status"> & { type: CourseTypeInfo };

/** The select list that yields a PathwayCourse, embedding the course's type. */
export const PATHWAY_COURSE_COLUMNS = "id, code, title, credits, status, type:course_types(id, name, color, coop)";
export type PathwayTerm = Pick<Term, "id" | "name" | "kind"> & { courses: PathwayCourse[] };

export type TermPhase = "past" | "current" | "future";
export type TermSummary = PathwayTerm & { totalSh: number; phase: TermPhase };

// Orders terms by id and courses by code, and adds each term's credit total and phase.
// Both are derived here and never stored.
export function summarizeTerms(terms: PathwayTerm[]): TermSummary[] {
  const sorted = [...terms].sort((a, b) => a.id - b.id);
  const phases = termPhases(sorted);
  return sorted.map((term, index) => ({
    ...term,
    courses: [...term.courses].sort((a, b) => a.code.localeCompare(b.code)),
    totalSh: term.courses.reduce((total, course) => total + course.credits, 0),
    phase: phases[index],
  }));
}

// Term dates are not stored yet, so the phase comes from course status. Any term with a course
// in progress is current and everything before the first one is past. With nothing in progress,
// every term up to the last fully finished one is past. Empty terms (co-ops) follow their position.
function termPhases(terms: PathwayTerm[]): TermPhase[] {
  const hasInProgress = (term: PathwayTerm) => term.courses.some((course) => course.status === "in_progress");
  const allDone = (term: PathwayTerm) =>
    term.courses.length > 0 && term.courses.every((course) => course.status === "done");

  const firstCurrent = terms.findIndex(hasInProgress);
  const pastBefore = firstCurrent >= 0 ? firstCurrent : terms.findLastIndex(allDone) + 1;

  return terms.map((term, index) => {
    if (hasInProgress(term)) return "current";
    return index < pastBefore ? "past" : "future";
  });
}
