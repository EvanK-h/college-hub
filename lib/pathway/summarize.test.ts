import { describe, expect, it } from "vitest";
import { summarizeTerms, type PathwayCourse, type PathwayTerm } from "./summarize";

const course = (code: string, credits: number, status: PathwayCourse["status"] = "planned"): PathwayCourse => ({
  id: code,
  code,
  title: `Title of ${code}`,
  credits,
  type: { id: "core", name: "Core", color: 1, coop: false },
  status,
});

describe("summarizeTerms", () => {
  const terms: PathwayTerm[] = [
    { id: 2, name: "Fall 2027", kind: "semester", courses: [course("CS 3100", 4), course("CS 2510", 4), course("CS 1000", 1)] },
    { id: 0, name: "Transfer credit", kind: "transfer", courses: [course("MATH 1341", 4)] },
    { id: 1, name: "Co-op 1", kind: "coop", courses: [] },
  ];

  it("orders terms by id", () => {
    expect(summarizeTerms(terms).map((term) => term.name)).toEqual(["Transfer credit", "Co-op 1", "Fall 2027"]);
  });

  it("totals SH per term, with 0 for an empty term", () => {
    expect(summarizeTerms(terms).map((term) => term.totalSh)).toEqual([4, 0, 9]);
  });

  it("orders courses by code within a term", () => {
    const fall = summarizeTerms(terms).find((term) => term.name === "Fall 2027");
    expect(fall?.courses.map((c) => c.code)).toEqual(["CS 1000", "CS 2510", "CS 3100"]);
  });

  it("does not change the input", () => {
    const before = JSON.stringify(terms);
    summarizeTerms(terms);
    expect(JSON.stringify(terms)).toBe(before);
  });
});

describe("summarizeTerms phases", () => {
  const term = (id: number, ...courses: PathwayCourse[]): PathwayTerm => ({
    id,
    name: `Term ${id}`,
    kind: courses.length ? "semester" : "coop",
    courses,
  });
  const phases = (terms: PathwayTerm[]) => summarizeTerms(terms).map((summary) => summary.phase);

  it("marks the term with a course in progress as current, earlier terms past and later terms future", () => {
    expect(
      phases([
        term(0, course("A", 4, "done")),
        term(1, course("B", 4, "done"), course("C", 4, "in_progress")),
        term(2, course("D", 4)),
      ]),
    ).toEqual(["past", "current", "future"]);
  });

  it("treats an empty co-op term by its position", () => {
    expect(
      phases([term(0, course("A", 4, "done")), term(1), term(2, course("B", 4, "in_progress")), term(3)]),
    ).toEqual(["past", "past", "current", "future"]);
  });

  it("with nothing in progress, counts terms up to the last finished one as past", () => {
    expect(phases([term(0, course("A", 4, "done")), term(1, course("B", 4, "done")), term(2, course("C", 4))])).toEqual([
      "past",
      "past",
      "future",
    ]);
  });

  it("marks everything future when nothing has started", () => {
    expect(phases([term(0, course("A", 4)), term(1)])).toEqual(["future", "future"]);
  });
});
