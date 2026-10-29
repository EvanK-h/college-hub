import { describe, expect, it } from "vitest";
import { buildPlan, comparePlans, countChanges, parseSwapCourse, type RealCourse } from "./build";

// An invented plan: a done course, two planned ones, and one added after the plan was saved.
const course = (id: string, code: string, termId: number, status: RealCourse["status"] = "planned"): RealCourse => ({
  id,
  code,
  title: code,
  credits: 4,
  type: { id: "core", name: "Core", color: 1, coop: false },
  status,
  termId,
});
const real = [course("done", "CS 1000", 1, "done"), course("a", "CS 2000", 2), course("b", "CS 3000", 3), course("new", "CS 4000", 4)];
const swaps = [
  { id: "s1", swapIn: "CY 4770 · Foundations of Cryptography" },
  { id: "s2", swapIn: "PHYS 2371 + 2372 · Electronics with lab" },
];
const row = (courseId: string, termId: number) => ({ courseId, termId, swapOptionId: null, replacesCourseId: null });
const swapRow = (swapOptionId: string, replacesCourseId: string, termId: number) => ({ courseId: null, termId, swapOptionId, replacesCourseId });

describe("parseSwapCourse", () => {
  it("reads 'CODE · Title' and nothing else", () => {
    expect(parseSwapCourse("CY 4770 · Foundations of Cryptography")).toEqual({ code: "CY 4770", title: "Foundations of Cryptography" });
    expect(parseSwapCourse("PHYS 2371 + 2372 · Electronics with lab")).toBeNull();
    expect(parseSwapCourse("INSH 1600 or PHIL 1115 (in place of MATH 2341)")).toBeNull();
  });
});

describe("buildPlan", () => {
  it("moves planned courses, keeps the rest in their real terms", () => {
    // The plan tries to move the done course too; it stays put. "new" has no row, so it stays.
    const plan = buildPlan(real, [row("done", 4), row("a", 3), row("b", 3)], swaps);
    expect(plan.map((item) => [item.code, item.termId])).toEqual([["CS 1000", 1], ["CS 2000", 3], ["CS 3000", 3], ["CS 4000", 4]]);
  });

  it("puts a swap in place of the course it replaces, with that course's credits and type", () => {
    const plan = buildPlan(real, [row("a", 2), row("b", 3), swapRow("s1", "b", 4)], swaps);
    const swap = plan.find((item) => item.code === "CY 4770");
    expect(swap).toMatchObject({ id: "swap:s1", termId: 4, credits: 4, type: { id: "core" }, status: "planned", replaces: { id: "b", code: "CS 3000" } });
    expect(plan.some((item) => item.id === "b")).toBe(false);
  });

  it("ignores a swap whose name isn't a single course", () => {
    const plan = buildPlan(real, [row("b", 3), swapRow("s2", "b", 3)], swaps);
    expect(plan.find((item) => item.id === "b")?.termId).toBe(3);
  });
});

describe("comparePlans and countChanges", () => {
  const base = buildPlan(real, [], swaps);
  const plan = buildPlan(real, [row("a", 3), swapRow("s1", "b", 3)], swaps);

  it("marks moves and courses only one plan has", () => {
    const changes = comparePlans(plan, base);
    expect(changes.get("done")).toEqual({ kind: "same" });
    expect(changes.get("a")).toEqual({ kind: "moved", fromTermId: 2 });
    expect(changes.get("swap:s1")).toEqual({ kind: "only_here" });
    expect(comparePlans(base, plan).get("b")).toEqual({ kind: "only_here" });
  });

  it("counts a move and a swap as two changes", () => {
    expect(countChanges(plan, base)).toBe(2);
    expect(countChanges(base, base)).toBe(0);
  });
});
