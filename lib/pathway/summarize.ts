import type { Database } from "@/lib/database.types";

type Term = Database["public"]["Tables"]["terms"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];

// Only the columns the pathway page shows, so tests can build inputs without every field.
export type PathwayCourse = Pick<Course, "id" | "code" | "title" | "credits" | "type" | "status">;
export type PathwayTerm = Pick<Term, "id" | "name" | "kind"> & { courses: PathwayCourse[] };

export type TermSummary = PathwayTerm & { totalSh: number };

// Orders terms by id and courses by code, and adds each term's SH total.
// The total is derived here and never stored.
export function summarizeTerms(terms: PathwayTerm[]): TermSummary[] {
  return [...terms]
    .sort((a, b) => a.id - b.id)
    .map((term) => ({
      ...term,
      courses: [...term.courses].sort((a, b) => a.code.localeCompare(b.code)),
      totalSh: term.courses.reduce((total, course) => total + course.credits, 0),
    }));
}
