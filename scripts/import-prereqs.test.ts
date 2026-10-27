import { describe, expect, it } from "vitest";
import { toPrereqRows } from "./import-prereqs";
import { PREREQS } from "./prereqs";

const OWNER = "11111111-1111-4111-8111-111111111111";

describe("the catalogue list", () => {
  const codes = PREREQS.flatMap((entry) => [entry.course, ...[...(entry.prereq ?? []), ...(entry.coreq ?? [])].flat()]);

  it("uses only real course codes, in the database's format", () => {
    for (const code of codes) expect(code).toMatch(/^[A-Z]{2,4} \d{4}$/);
  });

  it("lists each course once, with no empty groups or repeated codes in a group", () => {
    const courses = PREREQS.map((entry) => entry.course);
    expect(new Set(courses).size).toBe(courses.length);
    for (const entry of PREREQS) {
      for (const group of [...(entry.prereq ?? []), ...(entry.coreq ?? [])]) {
        expect(group.length).toBeGreaterThan(0);
        expect(new Set(group).size).toBe(group.length);
      }
    }
  });

  it("never makes a course its own prerequisite", () => {
    for (const entry of PREREQS) expect([...(entry.prereq ?? []), ...(entry.coreq ?? [])].flat()).not.toContain(entry.course);
  });
});

describe("toPrereqRows", () => {
  it("writes one row per code, numbering groups from 1 per kind", () => {
    const ids = new Map([["CS 3000", "c3000"], ["PHYS 2303", "p2303"]]);
    const { rows, missing } = toPrereqRows(
      [
        { course: "CS 3000", prereq: [["CS 2100", "CS 2700"], ["CS 1800"]] },
        { course: "PHYS 2303", prereq: [["PHYS 1155"]], coreq: [["MATH 2321"]] },
        { course: "XX 9999", prereq: [["CS 1800"]] },
      ],
      ids,
      OWNER,
    );
    expect(missing).toEqual(["XX 9999"]);
    expect(rows).toEqual([
      { course_id: "c3000", requires_code: "CS 2100", kind: "prereq", option_group: 1, owner_id: OWNER },
      { course_id: "c3000", requires_code: "CS 2700", kind: "prereq", option_group: 1, owner_id: OWNER },
      { course_id: "c3000", requires_code: "CS 1800", kind: "prereq", option_group: 2, owner_id: OWNER },
      { course_id: "p2303", requires_code: "PHYS 1155", kind: "prereq", option_group: 1, owner_id: OWNER },
      { course_id: "p2303", requires_code: "MATH 2321", kind: "coreq", option_group: 1, owner_id: OWNER },
    ]);
  });
});
