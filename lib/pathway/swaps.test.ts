import { describe, expect, it } from "vitest";
import { buildSwapGroups, type Swap } from "./swaps";

const slots = [
  { id: "london", name: "London elective" },
  { id: "ai", name: "AI elective" },
];

const swap = (id: string, slotId: string): Swap => ({
  id,
  swap_in: `Swap ${id}`,
  slot_id: slotId,
  fits_in: null,
  prerequisites: null,
  why_consider: null,
  why_current_better: null,
});

const courses = [
  { id: "c1", code: "CS 1000", title: "One" },
  { id: "c2", code: "CS 2000", title: "Two" },
];

describe("buildSwapGroups", () => {
  it("groups swaps by slot in the slots' order and drops empty slots", () => {
    const groups = buildSwapGroups([...slots, { id: "empty", name: "Empty" }], [swap("a", "ai"), swap("b", "london")], [], courses);
    expect(groups.map((group) => group.slot.id)).toEqual(["london", "ai"]);
  });

  it("keeps the input order within a slot", () => {
    const groups = buildSwapGroups(slots, [swap("b", "ai"), swap("a", "ai")], [], courses);
    expect(groups[0].swaps.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("attaches the replaced courses and skips links to unknown courses", () => {
    const links = [
      { swap_option_id: "a", course_id: "c1" },
      { swap_option_id: "a", course_id: "c2" },
      { swap_option_id: "a", course_id: "missing" },
    ];
    const [group] = buildSwapGroups(slots, [swap("a", "ai")], links, courses);
    expect(group.swaps[0].replaces.map((course) => course.code)).toEqual(["CS 1000", "CS 2000"]);
  });
});
