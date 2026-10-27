import { describe, expect, it } from "vitest";
import { buildSwapGroups, type Swap } from "./swaps";

const swap = (id: string, slot: Swap["slot"]): Swap => ({
  id,
  swap_in: `Swap ${id}`,
  slot,
  fits_in: null,
  prerequisites: null,
  quantum_relevance: "low",
  ai_relevance: "none",
  why_consider: null,
  why_current_better: null,
});

const courses = [
  { id: "c1", code: "CS 1000", title: "One" },
  { id: "c2", code: "CS 2000", title: "Two" },
];

describe("buildSwapGroups", () => {
  it("groups swaps by slot in a fixed order and drops empty slots", () => {
    const groups = buildSwapGroups([swap("a", "ai_elective"), swap("b", "london_elective")], [], courses);
    expect(groups.map((group) => group.slot)).toEqual(["london_elective", "ai_elective"]);
  });

  it("keeps the input order within a slot", () => {
    const groups = buildSwapGroups([swap("b", "ai_elective"), swap("a", "ai_elective")], [], courses);
    expect(groups[0].swaps.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("attaches the replaced courses and skips links to unknown courses", () => {
    const links = [
      { swap_option_id: "a", course_id: "c1" },
      { swap_option_id: "a", course_id: "c2" },
      { swap_option_id: "a", course_id: "missing" },
    ];
    const [group] = buildSwapGroups([swap("a", "ai_elective")], links, courses);
    expect(group.swaps[0].replaces.map((course) => course.code)).toEqual(["CS 1000", "CS 2000"]);
  });
});
