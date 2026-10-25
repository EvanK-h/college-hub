import { describe, expect, it } from "vitest";
import { summarizeTerms, type PathwayCourse, type PathwayTerm } from "./summarize";

const course = (code: string, credits: number): PathwayCourse => ({
  id: code,
  code,
  title: `Title of ${code}`,
  credits,
  type: "cs_core",
  status: "planned",
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
