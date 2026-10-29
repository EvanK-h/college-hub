import { describe, expect, it } from "vitest";
import { ancestors, buildPrereqGraph, chainTo, descendants, type GraphCourse } from "./graph";
import type { PlanPrereq } from "./move-checks";

const terms = [
  { id: 0, name: "Transfer" },
  { id: 1, name: "Fall" },
  { id: 2, name: "Spring" },
  { id: 3, name: "Summer" },
];
const course = (id: string, code: string, termId: number): GraphCourse => ({ id, code, title: code, color: 1, status: "planned", termId });
const req = (courseId: string, requiresCode: string, kind: PlanPrereq["kind"] = "prereq", group = 1): PlanPrereq => ({ courseId, requiresCode, kind, group });

// An invented plan: A (transfer) → B → C, B's lab beside it, D recommended after C, E with no links.
const courses = [course("a", "A 1000", 0), course("b", "B 2000", 1), course("bl", "B 2001", 1), course("c", "C 3000", 2), course("d", "D 4000", 3), course("e", "E 5000", 2)];
const prereqs = [req("b", "A 1000"), req("b", "B 2001", "coreq"), req("c", "B 2000"), req("c", "X 9999"), req("d", "C 3000", "recommended")];

describe("buildPrereqGraph", () => {
  const graph = buildPrereqGraph(terms, courses, prereqs);

  it("draws only linked courses, in their term's column", () => {
    expect(graph.nodes.map((n) => [n.code, n.column])).toEqual([["A 1000", 0], ["B 2000", 1], ["B 2001", 1], ["C 3000", 2], ["D 4000", 3]]);
  });

  it("links each requirement to the course that needs it, with its kind", () => {
    expect(graph.edges.map((e) => [e.from, e.to, e.kind])).toEqual([
      ["a", "b", "prereq"],
      ["bl", "b", "coreq"],
      ["b", "c", "prereq"],
      ["c", "d", "recommended"],
    ]);
  });

  it("marks an alternative only when more than one choice is in the plan", () => {
    // X 9999 isn't in the plan, so B 2000 is C 3000's only route.
    expect(graph.edges.find((e) => e.to === "c")?.alternative).toBe(false);
    const both = buildPrereqGraph(terms, [...courses, course("x", "X 9999", 0)], prereqs);
    expect(both.edges.filter((e) => e.to === "c").every((e) => e.alternative)).toBe(true);
  });

  it("draws a course in several groups once, as required if any group needs it alone", () => {
    // C 3000 needs (B or X) and (B): B is in both groups, and the second has no other choice.
    const g = buildPrereqGraph(terms, [...courses, course("x", "X 9999", 0)], [...prereqs, req("c", "B 2000", "prereq", 2)]);
    const fromB = g.edges.filter((e) => e.from === "b" && e.to === "c");
    expect(fromB).toHaveLength(1);
    expect(fromB[0]?.alternative).toBe(false);
  });

  it("flags arrows the plan has the wrong way round", () => {
    expect(graph.edges.some((e) => e.problem)).toBe(false);
    const late = buildPrereqGraph(terms, courses.map((c) => (c.id === "b" ? { ...c, termId: 2 } : c)), prereqs);
    // B 2000 now shares C 3000's term: its prerequisite arrow is wrong, and its lab is a term early (fine).
    expect(late.edges.find((e) => e.to === "c")?.problem).toBe(true);
    expect(late.edges.find((e) => e.from === "bl")?.problem).toBe(false);
  });

  it("never flags a recommended link", () => {
    const early = buildPrereqGraph(terms, courses.map((c) => (c.id === "d" ? { ...c, termId: 1 } : c)), prereqs);
    expect(early.edges.find((e) => e.kind === "recommended")?.problem).toBe(false);
  });

  it("lists requirement groups with nothing in the plan", () => {
    const placed = buildPrereqGraph(terms, courses, [...prereqs, req("b", "Z 1000", "prereq", 2), req("b", "Z 1001", "prereq", 2)]);
    expect(placed.unmet.get("b")).toEqual(["Z 1000 or Z 1001"]);
  });

  it("orders a column by where its requirements sit", () => {
    // Two courses in Spring: Q needs the second Fall course, P needs the first, so P goes above Q.
    const g = buildPrereqGraph(
      terms,
      [course("f1", "F 1000", 1), course("f2", "F 2000", 1), course("q", "A 9000", 2), course("p", "Z 9000", 2)],
      [req("q", "F 2000"), req("p", "F 1000")],
    );
    expect(g.nodes.filter((n) => n.column === 1).map((n) => n.code)).toEqual(["Z 9000", "A 9000"]);
  });
});

describe("ancestors and descendants", () => {
  const { edges } = buildPrereqGraph(terms, courses, prereqs);

  it("follows arrows backwards and forwards, through every hop", () => {
    expect(ancestors("c", edges)).toEqual(new Set(["b", "a", "bl"]));
    expect(descendants("a", edges)).toEqual(new Set(["b", "c", "d"]));
    expect(descendants("d", edges)).toEqual(new Set());
  });

  it("builds the chain leading to a goal course, including recommended links", () => {
    const { nodes } = buildPrereqGraph(terms, courses, prereqs);
    expect(chainTo("D 4000", nodes, edges)).toEqual(new Set(["d", "c", "b", "a", "bl"]));
    expect(chainTo("Q 0000", nodes, edges)).toEqual(new Set());
  });
});
