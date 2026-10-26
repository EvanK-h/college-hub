import { describe, expect, it } from "vitest";
import { canvasCourseOptions, parseCourseLink, suggestCanvasCourse } from "./course-links";

// All invented. The uuid is just a well-formed one.
const COURSE_ID = "4f9d6f3a-8c1e-4b7a-9d2e-1a2b3c4d5e6f";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseCourseLink", () => {
  it("reads a Canvas course id", () => {
    const result = parseCourseLink(form({ courseId: COURSE_ID, canvasCourseId: "12345" }));
    expect(result.data).toEqual({ courseId: COURSE_ID, canvasCourseId: 12345 });
  });

  it("treats an empty choice as 'not linked'", () => {
    expect(parseCourseLink(form({ courseId: COURSE_ID, canvasCourseId: "" })).data?.canvasCourseId).toBeNull();
    expect(parseCourseLink(form({ courseId: COURSE_ID, canvasCourseId: "  " })).data?.canvasCourseId).toBeNull();
  });

  it("rejects ids that aren't positive whole numbers", () => {
    for (const bad of ["abc", "0", "-5", "12.5", "1e3x"]) {
      expect(parseCourseLink(form({ courseId: COURSE_ID, canvasCourseId: bad })).success).toBe(false);
    }
  });

  it("rejects a course id that isn't a uuid, or a missing field", () => {
    expect(parseCourseLink(form({ courseId: "not-a-uuid", canvasCourseId: "1" })).success).toBe(false);
    expect(parseCourseLink(form({ courseId: COURSE_ID })).success).toBe(false);
  });
});

describe("suggestCanvasCourse", () => {
  const canvas = [
    { id: 1, name: "Intro to Computer Science", course_code: "CS2100.202610" },
    { id: 2, name: "Physics I", course_code: "PHYS 1155" },
    { id: 3, name: "Fall 2026 - Writing Seminar", course_code: null },
  ];

  it("matches a code however Canvas formats it", () => {
    expect(suggestCanvasCourse("CS 2100", canvas)).toBe(1);
    expect(suggestCanvasCourse("PHYS 1155", canvas)).toBe(2);
    expect(suggestCanvasCourse("cs2100", canvas)).toBe(1);
    expect(suggestCanvasCourse("CS 2100", [{ id: 9, name: "Fall 2026 CS-2100 Intro" }])).toBe(9);
  });

  it("returns null when nothing matches", () => {
    expect(suggestCanvasCourse("MATH 1341", canvas)).toBeNull();
  });

  it("does not match part of a longer number or a longer prefix", () => {
    expect(suggestCanvasCourse("CS 210", canvas)).toBeNull();
    expect(suggestCanvasCourse("CS 2100", [{ id: 9, name: "CS 21000 Advanced" }])).toBeNull();
    expect(suggestCanvasCourse("CS 2100", [{ id: 9, name: "ACS 2100" }])).toBeNull();
  });

  it("returns null when more than one course matches", () => {
    const twins = [
      { id: 1, name: "CS 2100 Lecture" },
      { id: 2, name: "CS 2100 Lab" },
    ];
    expect(suggestCanvasCourse("CS 2100", twins)).toBeNull();
  });

  it("gives up on codes that aren't letters followed by digits", () => {
    expect(suggestCanvasCourse("Co-op 1", canvas)).toBeNull();
    expect(suggestCanvasCourse("", canvas)).toBeNull();
  });
});

describe("canvasCourseOptions", () => {
  const canvas = [
    { id: 1, name: "Intro to Computer Science", course_code: "CS2100" },
    { id: 2, name: "Physics I", course_code: "Physics I" },
    { id: 3, name: "Writing Seminar" },
  ];

  it("starts with 'Not linked' and labels each course by code and name", () => {
    expect(canvasCourseOptions(canvas, null)).toEqual([
      { value: "", label: "Not linked" },
      { value: "1", label: "CS2100 · Intro to Computer Science" },
      { value: "2", label: "Physics I" },
      { value: "3", label: "Writing Seminar" },
    ]);
  });

  it("keeps an existing link that isn't in the list, so saving can't drop it", () => {
    const options = canvasCourseOptions(canvas, 999);
    expect(options.at(-1)).toEqual({ value: "999", label: "Canvas course 999" });
  });

  it("doesn't duplicate a link that is in the list", () => {
    expect(canvasCourseOptions(canvas, 1)).toHaveLength(4);
  });

  it("still shows the existing link when Canvas could not be reached", () => {
    expect(canvasCourseOptions([], 42)).toEqual([
      { value: "", label: "Not linked" },
      { value: "42", label: "Canvas course 42" },
    ]);
  });
});
