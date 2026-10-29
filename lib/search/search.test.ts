import { describe, expect, it } from "vitest";
import { matchActions, matchPages, pageAt, searchPattern } from "./search";

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

describe("matchActions", () => {
  it("lists every action with no query, and matches names or keywords", () => {
    expect(matchActions("").length).toBeGreaterThan(3);
    expect(matchActions("dark").map((r) => r.label)).toEqual(["Use dark appearance"]);
    expect(matchActions("canvas").map((r) => "action" in r && r.action)).toEqual(["sync"]);
    expect(matchActions("zzz")).toEqual([]);
  });
});

describe("pageAt", () => {
  it("names listed pages and course pages", () => {
    expect(pageAt("/pathway/swaps")).toEqual({ href: "/pathway/swaps", label: "Swaps" });
    expect(pageAt("/courses/cs-2100")).toEqual({ href: "/courses/cs-2100", label: "CS 2100" });
  });

  it("skips pages it can't name", () => {
    expect(pageAt("/pathway/plans/0b0c")).toBeNull();
    expect(pageAt("/courses/not-a-course")).toBeNull();
  });
});

