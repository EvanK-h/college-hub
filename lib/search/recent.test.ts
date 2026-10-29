import { describe, expect, it } from "vitest";
import { MAX_RECENT, parseRecent, rememberPage } from "./recent";

describe("rememberPage", () => {
  it("puts the page first without duplicating it", () => {
    const list = [
      { href: "/calendar", label: "Calendar" },
      { href: "/", label: "Today" },
    ];
    expect(rememberPage(list, { href: "/", label: "Today" }).map((page) => page.href)).toEqual(["/", "/calendar"]);
  });

  it("keeps only the most recent pages", () => {
    let list = parseRecent(null);
    for (let index = 0; index < MAX_RECENT + 2; index++) list = rememberPage(list, { href: `/p${index}`, label: `P${index}` });
    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0]?.href).toBe(`/p${MAX_RECENT + 1}`);
  });
});

describe("parseRecent", () => {
  it("reads back what was stored", () => {
    const list = [{ href: "/courses/cs-2100", label: "CS 2100" }];
    expect(parseRecent(JSON.stringify(list))).toEqual(list);
  });

  it("ignores anything it didn't write", () => {
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent(JSON.stringify([{ href: "https://example.com", label: "x" }]))).toEqual([]);
    expect(parseRecent(JSON.stringify({ href: "/" }))).toEqual([]);
  });
});
