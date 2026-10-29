import { describe, expect, it } from "vitest";
import { checkMove, describeProblem, planProblems, type PlanCourse, type PlanPrereq, type PlanTerm } from "./move-checks";

const terms: PlanTerm[] = [
  { id: 0, name: "Transfer credit", kind: "transfer" },
  { id: 1, name: "Fall 1", kind: "semester" },
  { id: 2, name: "Spring 1", kind: "semester" },
  { id: 3, name: "Summer 1", kind: "summer" },
  { id: 4, name: "Co-op 1", kind: "coop" },
  { id: 5, name: "Fall 2", kind: "semester" },
];

const course = (id: string, code: string, termId: number, credits = 4, coop = false): PlanCourse => ({ id, code, credits, coop, termId });

// An invented chain: A 1000 (transfer) → B 2000 (+ coreq B 2001) → C 3000, which accepts B 2000 or X 9999.
const courses: PlanCourse[] = [
  course("a", "A 1000", 0),
  course("b", "B 2000", 1),
  course("b-lab", "B 2001", 1, 1),
  course("c", "C 3000", 2),
  course("coop", "COOP 3945", 4, 0, true),
];
const prereqs: PlanPrereq[] = [
  { courseId: "b", requiresCode: "A 1000", kind: "prereq", group: 1 },
  { courseId: "b", requiresCode: "B 2001", kind: "coreq", group: 1 },
  { courseId: "b-lab", requiresCode: "B 2000", kind: "coreq", group: 1 },
  { courseId: "c", requiresCode: "B 2000", kind: "prereq", group: 1 },
  { courseId: "c", requiresCode: "X 9999", kind: "prereq", group: 1 },
];
// Invented limits: 18 a semester, 9 a summer, nothing for transfer or co-op terms.
const limits = { semester: 18, summer: 9 };
const plan = { terms, courses, prereqs, limits };

describe("checkMove", () => {
  it("allows a move that keeps every requirement", () => {
    expect(checkMove(plan, "c", 5)).toEqual([]);
  });

  it("flags a prerequisite that would no longer come first", () => {
    // C 3000 into Fall 1, the same term as B 2000: not earlier.
    expect(checkMove(plan, "c", 1)).toContainEqual({ kind: "missing_prereq", options: ["B 2000", "X 9999"] });
  });

  it("accepts any course in an OR-group", () => {
    const withAlternative = { ...plan, courses: [...courses, course("x", "X 9999", 0)] };
    expect(checkMove(withAlternative, "c", 1)).toEqual([]);
  });

  it("allows a corequisite in the same term or earlier, not a later one", () => {
    expect(checkMove(plan, "b-lab", 1)).toEqual([]);
    // The lab moved before its lecture: the lab's own corequisite is now in a later term.
    expect(checkMove(plan, "b-lab", 0)).toContainEqual({ kind: "missing_coreq", options: ["B 2000"] });
  });

  it("catches a lecture moved away from its lab through the lab's corequisite", () => {
    const problems = checkMove(plan, "b", 2);
    expect(problems).not.toContainEqual(expect.objectContaining({ kind: "missing_coreq" })); // its lab is earlier, which counts
    expect(problems).toContainEqual({ kind: "breaks_dependent", course: "B 2001", requirement: "coreq" });
  });

  it("flags courses that depend on the moved one", () => {
    // B 2000 moved after C 3000 breaks C 3000; moving it out of Fall 1 also strands its lab.
    const problems = checkMove(plan, "b", 5);
    expect(problems).toContainEqual({ kind: "breaks_dependent", course: "C 3000", requirement: "prereq" });
    expect(problems).toContainEqual({ kind: "breaks_dependent", course: "B 2001", requirement: "coreq" });
  });

  it("doesn't blame the move for a dependent that was already broken", () => {
    const alreadyBroken = { ...plan, courses: courses.map((c) => (c.id === "c" ? { ...c, termId: 1 } : c)) };
    expect(checkMove(alreadyBroken, "b-lab", 1)).toEqual([]);
  });

  it("keeps ordinary courses out of co-op terms, but not the co-op itself", () => {
    expect(checkMove(plan, "c", 4)).toContainEqual({ kind: "coop_term" });
    expect(checkMove(plan, "coop", 4)).not.toContainEqual({ kind: "coop_term" });
  });

  it("flags a term over its SH limit", () => {
    const full = { ...plan, courses: [...courses, course("d", "D 1", 5, 4), course("e", "E 1", 5, 4), course("f", "F 1", 5, 4), course("g", "G 1", 5, 4)] };
    expect(checkMove(full, "c", 5)).toContainEqual({ kind: "over_limit", total: 20, limit: 18 });
    expect(checkMove(plan, "c", 3)).toEqual([]); // 4 SH fits a summer term
  });

  it("has no limit for a kind of term the profile doesn't limit", () => {
    const full = { ...plan, limits: {}, courses: [...courses, course("d", "D 1", 5, 40)] };
    expect(checkMove(full, "c", 5)).toEqual([]);
  });

  it("ignores recommended links", () => {
    const advised = { ...plan, prereqs: [...prereqs, { courseId: "c", requiresCode: "Z 5000", kind: "recommended" as const, group: 1 }] };
    expect(checkMove(advised, "c", 5)).toEqual([]);
  });

  it("ignores unknown courses or terms", () => {
    expect(checkMove(plan, "nope", 1)).toEqual([]);
    expect(checkMove(plan, "c", 99)).toEqual([]);
  });
});

describe("describeProblem", () => {
  it("writes one plain sentence per problem", () => {
    expect(describeProblem({ kind: "missing_prereq", options: ["B 2000", "X 9999"] }, "Fall 1")).toBe("Needs one of B 2000, X 9999 in an earlier term.");
    expect(describeProblem({ kind: "missing_coreq", options: ["B 2001"] }, "Fall 1")).toBe("Needs B 2001 in Fall 1 or earlier.");
    expect(describeProblem({ kind: "breaks_dependent", course: "C 3000", requirement: "prereq" }, "Fall 2")).toBe("C 3000 needs this in an earlier term.");
    expect(describeProblem({ kind: "coop_term" }, "Co-op 1")).toBe("Co-op 1 is a co-op term.");
    expect(describeProblem({ kind: "over_limit", total: 20, limit: 18 }, "Fall 2", "SH")).toBe("Fall 2 would have 20 SH, over the 18 SH limit.");
    expect(describeProblem({ kind: "over_limit", total: 20, limit: 18 }, "Fall 2")).toBe("Fall 2 would have 20 credits, over the 18 credits limit.");
  });
});

describe("planProblems", () => {
  const terms = [
    { id: 0, name: "Transfer", kind: "transfer" as const },
    { id: 1, name: "Fall", kind: "semester" as const },
    { id: 2, name: "Co-op", kind: "coop" as const },
  ];
  const c = (id: string, code: string, termId: number, credits = 4) => ({ id, code, credits, coop: false, termId });
  const prereqs = [{ courseId: "b", requiresCode: "A 1000", kind: "prereq" as const, group: 1 }];

  it("finds nothing wrong with a sound plan", () => {
    expect(planProblems({ terms, courses: [c("a", "A 1000", 0), c("b", "B 2000", 1)], prereqs })).toEqual([]);
  });

  it("lists unmet requirements, co-op terms and over-full terms, by term", () => {
    const courses = [c("a", "A 1000", 1), c("b", "B 2000", 1, 16), c("x", "X 1000", 2)];
    expect(planProblems({ terms, courses, prereqs, limits: { semester: 18 } })).toEqual([
      { termId: 1, courseCode: "B 2000", problem: { kind: "missing_prereq", options: ["A 1000"] } },
      { termId: 1, problem: { kind: "over_limit", total: 20, limit: 18 } },
      { termId: 2, courseCode: "X 1000", problem: { kind: "coop_term" } },
    ]);
  });
});
