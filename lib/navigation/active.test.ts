import { describe, expect, it } from "vitest";
import { activeHref } from "./active";

const HREFS = ["/", "/calendar", "/pathway", "/pathway/requirements", "/settings"];

describe("activeHref", () => {
  it("matches a page exactly", () => {
    expect(activeHref("/", HREFS)).toBe("/");
    expect(activeHref("/calendar", HREFS)).toBe("/calendar");
  });

  it("lights up the parent tab on a deeper page", () => {
    expect(activeHref("/pathway/plans", HREFS)).toBe("/pathway");
    expect(activeHref("/pathway/plans/123", HREFS)).toBe("/pathway");
  });

  it("prefers the longest matching tab", () => {
    expect(activeHref("/pathway/requirements", HREFS)).toBe("/pathway/requirements");
  });

  it("doesn't treat a shared prefix as a parent", () => {
    expect(activeHref("/pathways", HREFS)).toBeNull();
  });

  it("uses the fallback for a page with no tab", () => {
    expect(activeHref("/courses/cs-1800", HREFS)).toBeNull();
    expect(activeHref("/courses/cs-1800", HREFS, "/")).toBe("/");
  });
});
