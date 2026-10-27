import { describe, expect, it } from "vitest";
import { codeFromSlug, coursePath, courseSlug } from "./slug";

describe("course slugs", () => {
  it("round-trips a course code", () => {
    expect(courseSlug("CS 2100")).toBe("cs-2100");
    expect(codeFromSlug("cs-2100")).toBe("CS 2100");
    expect(codeFromSlug(courseSlug("PHYS 1151"))).toBe("PHYS 1151");
    expect(coursePath("ENGW 1111")).toBe("/courses/engw-1111");
  });

  it("accepts any case", () => {
    expect(codeFromSlug("CS-2100")).toBe("CS 2100");
  });

  it.each(["cs2100", "cs-210", "computer-2100", "cs-2100-extra", "", "../settings"])("rejects %j", (slug) => {
    expect(codeFromSlug(slug)).toBeNull();
  });
});
