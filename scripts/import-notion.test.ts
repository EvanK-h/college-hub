import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractCourseCodes, parseCourses, parseRequirements, parseSwaps } from "./import-notion";

describe("extractCourseCodes", () => {
  it("drops Notion URLs and keeps the codes", () => {
    const cell = "PHYS 1155 (https://app.notion.com/p/a?pvs=21), Co-op 1 (https://app.notion.com/p/b?pvs=21)";
    expect(extractCourseCodes(cell)).toEqual(["PHYS 1155", "Co-op 1"]);
  });

  it("returns an empty list for an empty cell", () => {
    expect(extractCourseCodes("")).toEqual([]);
  });
});

// The Notion exports are personal data and gitignored, so this check only runs where they exist.
const read = (name: string) => readFileSync(`scripts/data/${name}.csv`, "utf-8");
const hasExports = ["courses", "requirements", "swap-options"].every((name) =>
  existsSync(`scripts/data/${name}.csv`),
);

describe.skipIf(!hasExports)("Notion import check", () => {
  const sum = (credits: number[]) => credits.reduce((total, value) => total + value, 0);

  it("finds 56 courses and 171 SH, 53 of them transfer credit", () => {
    const courses = parseCourses(read("courses"));
    expect(courses).toHaveLength(56);
    expect(sum(courses.map((course) => course.credits))).toBe(171);
    const transfer = courses.filter((course) => course.termName === "Transfer credit");
    expect(sum(transfer.map((course) => course.credits))).toBe(53);
  });

  it("finds 31 requirements and 32 swap options", () => {
    expect(parseRequirements(read("requirements"))).toHaveLength(31);
    expect(parseSwaps(read("swap-options"))).toHaveLength(32);
  });
});
