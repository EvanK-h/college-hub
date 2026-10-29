import { describe, expect, it } from "vitest";
import { planProgress } from "./progress";
import { summarizeTerms, type PathwayCourse } from "./summarize";

const course = (code: string, credits: number, status: PathwayCourse["status"], coop = false): PathwayCourse => ({
  id: code,
  code,
  title: code,
  credits,
  status,
  type: { id: coop ? "coop" : "core", name: coop ? "Co-op" : "Core", color: 1, coop },
});

// An invented plan: transfer credit, a finished term, the current one, a co-op and one more term.
const terms = summarizeTerms([
  { id: 0, name: "Transfer credit", kind: "transfer", courses: [course("A 1000", 8, "done")] },
  { id: 1, name: "Fall 1", kind: "semester", courses: [course("B 2000", 4, "done"), course("B 2001", 1, "done")] },
  { id: 2, name: "Spring 1", kind: "semester", courses: [course("C 3000", 4, "in_progress"), course("C 3001", 4, "planned")] },
  { id: 3, name: "Co-op 1", kind: "coop", courses: [course("COOP 3945", 0, "planned", true)] },
  { id: 4, name: "Fall 2", kind: "semester", courses: [course("D 4000", 4, "planned")] },
  { id: 5, name: "Spring 2", kind: "semester", courses: [] },
]);

describe("planProgress", () => {
  it("totals credits by status", () => {
    expect(planProgress(terms)).toMatchObject({ done: 13, inProgress: 4, planned: 8, total: 25 });
  });

  it("finishes in the last term with coursework, not an empty or co-op one", () => {
    expect(planProgress(terms).finalTerm).toBe("Fall 2");
  });

  it("counts terms with unfinished coursework, the current one included", () => {
    expect(planProgress(terms).termsLeft).toBe(2);
  });

  it("handles an empty plan", () => {
    expect(planProgress([])).toEqual({ done: 0, inProgress: 0, planned: 0, total: 0, finalTerm: null, termsLeft: 0 });
  });
});
