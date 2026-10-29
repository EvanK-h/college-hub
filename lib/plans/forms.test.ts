import { describe, expect, it } from "vitest";
import { parseNewPlan, parsePlanMove, parsePlanRef, parsePlanSwap } from "./forms";

const ID = "3f1c2b8e-9d4a-4c1e-8b7f-2a6d5e4c3b21";
const ID2 = "7a2b3c4d-5e6f-4a1b-9c8d-0e1f2a3b4c5d";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("plan forms", () => {
  it("trims a new plan's name and accepts the real plan or a plan id as its source", () => {
    expect(parseNewPlan(form({ name: "  Spring swap ", from: "current" })).data).toEqual({ name: "Spring swap", from: "current" });
    expect(parseNewPlan(form({ name: "Copy", from: ID })).success).toBe(true);
    expect(parseNewPlan(form({ name: "   ", from: "current" })).success).toBe(false);
    expect(parseNewPlan(form({ name: "x", from: "elsewhere" })).success).toBe(false);
  });

  it("accepts moves of courses and of swaps, nothing else", () => {
    expect(parsePlanMove({ planId: ID, courseId: ID2, termId: 3 }).success).toBe(true);
    expect(parsePlanMove({ planId: ID, courseId: `swap:${ID2}`, termId: 3 }).success).toBe(true);
    expect(parsePlanMove({ planId: ID, courseId: "swap:nope", termId: 3 }).success).toBe(false);
    expect(parsePlanMove({ planId: ID, courseId: ID2, termId: -1 }).success).toBe(false);
  });

  it("splits a swap choice into the swap and the course it replaces", () => {
    expect(parsePlanSwap(form({ planId: ID, choice: `${ID2}:${ID}` })).data).toEqual({ planId: ID, choice: { swapOptionId: ID2, courseId: ID } });
    expect(parsePlanSwap(form({ planId: ID, choice: "" })).success).toBe(false);
  });

  it("reads compare refs", () => {
    expect(parsePlanRef("current")).toBe("current");
    expect(parsePlanRef(ID)).toBe(ID);
    expect(parsePlanRef(["current"])).toBeNull();
    expect(parsePlanRef(undefined)).toBeNull();
  });
});
