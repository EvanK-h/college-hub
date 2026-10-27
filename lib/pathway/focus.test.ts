import { describe, expect, it } from "vitest";
import { parseFocus, sortByFocus } from "./focus";

describe("parseFocus", () => {
  it("accepts the two focuses and falls back to quantum", () => {
    expect(parseFocus("ai")).toBe("ai");
    expect(parseFocus("quantum")).toBe("quantum");
    expect(parseFocus(undefined)).toBe("quantum");
    expect(parseFocus("robots")).toBe("quantum");
  });
});

describe("sortByFocus", () => {
  const swaps = [
    { id: "crypto", quantum_relevance: "high", ai_relevance: "lower" },
    { id: "ml", quantum_relevance: "medium", ai_relevance: "high" },
    { id: "rl", quantum_relevance: "low", ai_relevance: "high" },
    { id: "writing", quantum_relevance: "none", ai_relevance: "none" },
  ] as const;

  it("ranks by the focus, then by the other direction", () => {
    expect(sortByFocus(swaps, "quantum").map((s) => s.id)).toEqual(["crypto", "ml", "rl", "writing"]);
    expect(sortByFocus(swaps, "ai").map((s) => s.id)).toEqual(["ml", "rl", "crypto", "writing"]);
  });
});
