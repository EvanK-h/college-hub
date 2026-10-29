import { describe, expect, it } from "vitest";
import { matchPages, searchPattern } from "./search";

describe("searchPattern", () => {
  it("wraps the query for ILIKE", () => {
    expect(searchPattern("  CS 21 ")).toBe("%CS 21%");
  });

  it("drops wildcards and filter separators so text matches literally", () => {
    expect(searchPattern("100%_done")).toBe("%100 done%");
    expect(searchPattern("a,title.eq.x)")).toBe("%a title.eq.x%");
  });

  it("skips queries too short to search", () => {
    expect(searchPattern("c")).toBeNull();
    expect(searchPattern(" % ")).toBeNull();
  });
});

describe("matchPages", () => {
  it("lists every page with no query, and matches names or keywords", () => {
    expect(matchPages("").length).toBeGreaterThan(5);
    expect(matchPages("cal").map((r) => r.label)).toEqual(["Calendar"]);
    expect(matchPages("dark").map((r) => r.label)).toEqual(["Settings"]);
    expect(matchPages("dashboard").map((r) => r.label)).toEqual(["Today"]);
  });
});
