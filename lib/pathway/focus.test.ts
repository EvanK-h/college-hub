import { describe, expect, it } from "vitest";
import { parseFocus, relevanceFor, sortByFocus } from "./focus";

describe("parseFocus", () => {
  it("accepts a known focus and falls back to the first", () => {
    expect(parseFocus("ai", ["quantum", "ai"])).toBe("ai");
    expect(parseFocus(undefined, ["quantum", "ai"])).toBe("quantum");
    expect(parseFocus("robots", ["quantum", "ai"])).toBe("quantum");
  });

  it("has no focus when none are set up", () => {
    expect(parseFocus("ai", [])).toBeNull();
  });
});

describe("sortByFocus", () => {
  const swaps = [
    { id: "crypto", relevance: { quantum: "high", ai: "lower" } },
    { id: "ml", relevance: { quantum: "medium", ai: "high" } },
    { id: "rl", relevance: { quantum: "low", ai: "high" } },
    { id: "writing", relevance: {} },
  ] as const;

  it("ranks by the focus, then by the other focuses", () => {
    expect(sortByFocus(swaps, "quantum", ["quantum", "ai"]).map((s) => s.id)).toEqual(["crypto", "ml", "rl", "writing"]);
    expect(sortByFocus(swaps, "ai", ["quantum", "ai"]).map((s) => s.id)).toEqual(["ml", "rl", "crypto", "writing"]);
  });

  it("treats a missing rating as none", () => {
    expect(relevanceFor(swaps[3], "quantum")).toBe("none");
  });
});
